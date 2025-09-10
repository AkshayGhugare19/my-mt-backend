import { ErrorMessages } from '@common/enums/error-messages.enum';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { EventNamespace } from '@infrastructure/event/namespace';
import { BalanceService } from '@modules/balance/service/balance.service';
import {
  BetProvider,
  BetProviders,
} from '@modules/bet/enum/bet-providers.enum';
import { BetStatus, BetStatuses } from '@modules/bet/enum/bet-status.enum';
import { BetLimitExceededError } from '@modules/bet/error/bet-limit-exceeded.error';
import { BetPlacedEvent } from '@modules/bet/event/bet-placed.event';
import { BetTransactionEvent } from '@modules/bet/event/bet-transaction.event';
import { BetSettledEvent } from '@modules/bet/event/bet-settled.event';
import {
  BetMetadata,
  CreateBet,
  CreateBetPayload
} from '@modules/bet/types';
import { getConsumedBalancesFromBet } from '@modules/bet/util/get-consumed-amount.from-bet';
import { DuplicateBetPlacementError } from '@modules/betting-providers/fungamess/error/duplicate-bet-placement.error';
import { mergeBetMetadata } from '@modules/betting-providers/utils/bet-metadata';
import { TransactionCounterParties, TransactionCounterParty } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionStatus } from '@modules/transaction-ledger/enum/status.enum';
import { TransactionTargetBalance } from '@modules/transaction-ledger/enum/target-balance.enum';
import { TransactionOperationType } from '@modules/transaction-ledger/enum/type.enum';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import {
  BetTransactionCounterParties,
} from '@modules/transaction-ledger/types';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Bet, Prisma, Transaction } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { pointsToUsd } from '@utils/points-to-usd';

@Injectable()
export class BetService {
  private readonly logger = new Logger(BetService.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly transactionLedgerService: TransactionLedgerService,
    private readonly balanceService: BalanceService,
    public readonly eventEmitter: EventEmitter2,
  ) {}

  async findByThirdPartyIdentifier({
    thirdPartyIdentifier,
  }: {
    thirdPartyIdentifier: string;
  }): Promise<Bet | null> {
    return this.prismaService.bet.findFirst({
      where: {
        thirdPartyIdentifier,
      },
    });
  }

  async findByUserAndThirdPartyIdentifier({
    thirdPartyIdentifier,
    userId,
  }: {
    userId: string;
    thirdPartyIdentifier: string;
  }): Promise<Bet | null> {
    return this.prismaService.bet.findFirst({
      where: {
        userId,
        thirdPartyIdentifier,
      },
    });
  }

  async findByProviderAndThirdPartyIdentifier({
    thirdPartyIdentifier,
    provider,
  }: {
    provider: BetProvider;
    thirdPartyIdentifier: string;
  }): Promise<Bet | null> {
    return this.prismaService.bet.findFirst({
      where: {
        provider,
        thirdPartyIdentifier,
      },
    });
  }

  /**
   *
   * @param createBet {@link CreateBet}
   * @param transactionManager
   * @returns
   */
  async placeBet(
    createBet: CreateBet,
    betConflictStrategy: 'merge' | 'abort',
    transactionManager?: PrismaTransactionManager,
  ): Promise<Bet> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (client) => {
        return this.placeBet(createBet, betConflictStrategy, client);
      });
    }
    const client = this.getClient(transactionManager);

    // Validate user's bet size
    const userData = await client.user.findFirst({
      where: { id: createBet.userId },
      include: {
        balance: {
          select: {
            balance: true,
          },
        },
      },
    });
    if (userData === null) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    if (
      userData.maxBetSize !== null &&
      createBet.betAmount > userData.maxBetSize
    ) {
      throw new BetLimitExceededError({ userId: createBet.userId });
    }

    const betPayload: CreateBetPayload = {
      betAmount: createBet.betAmount,
      metadata: { placeBet: createBet.metadata as Prisma.JsonObject },
      provider: createBet.provider,
      status: BetStatuses.PENDING,
      thirdPartyIdentifier: createBet.thirdPartyIdentifier,
      userId: createBet.userId,
      exposure: createBet.exposure || null,
      previousBalance: userData.balance?.balance || null,
    };

    const {
      transaction,
      consumedAccountBalance,
      consumedBonusBalance,
      bonusUsed,
    } = await this.balanceService.placeBet(
      {
        userId: createBet.userId,
        balanceChange: createBet.balanceChange,
        betAmount: createBet.betAmount,
        provider: this.translateBetProviderToCounterParty(createBet.provider),
        referenceId: createBet.thirdPartyIdentifier,
        bet: betPayload,
        metadata: createBet.metadata,
      },
      transactionManager,
    );

    const existingBetEvent = await client.bet.findFirst({
      where: {
        thirdPartyIdentifier: createBet.thirdPartyIdentifier,
        provider: createBet.provider,
      },
    });

    if (existingBetEvent) {
      if (betConflictStrategy === 'abort') {
        throw new DuplicateBetPlacementError(
          ErrorMessages.DUPLICATE_RESOURCE,
          existingBetEvent.thirdPartyIdentifier,
          'transactionId',
        );
      }
      if (betConflictStrategy === 'merge') {
        return this.mergeBets(existingBetEvent, createBet, transactionManager);
      }
    }

    const createdBet = await client.bet.create({
      data: {
        ...betPayload,
        debitTransactionId: transaction.id,
        metadata: {
          placeBet: createBet.metadata as Prisma.JsonObject,
          bonusUsed,
        },
      },
    });

    this.eventEmitter.emit(
      EventNamespace.BET_TRANSACTION,
      new BetTransactionEvent({
        betId: createdBet.id,
        thirdPartyIdentifier: createdBet.thirdPartyIdentifier,
        provider: createdBet.provider as BetProvider,
        pmBtag: userData.partnerMatrixBtag || undefined,
        pmId: userData.partnerMatrixId || undefined,
        transactionId: transaction.id,
        status: transaction.status as TransactionStatus,
        operationType: transaction.operationType as TransactionOperationType,
        targetBalance: transaction.targetBalance as TransactionTargetBalance,
        counterParty: transaction.counterParty as TransactionCounterParty,
        referenceId: createdBet.id,
        userId: createdBet.userId,
        amount: transaction.amount,
        usdAmount: new Decimal(pointsToUsd(Number(transaction.amount))),
      }),
    );

    this.eventEmitter.emit(
      EventNamespace.BET_PLACED,
      new BetPlacedEvent({
        amount: new Decimal(pointsToUsd(Number(createBet.betAmount))),
        betId: createdBet.id,
        provider: createBet.provider,
        userId: createBet.userId,
        pmId: userData.partnerMatrixId || undefined,
        pmBtag: userData.partnerMatrixBtag || undefined,
        status: createdBet.status as BetStatus,
        previousBalance: createdBet.previousBalance,
        transactionId: transaction.id,
        consumedAccountBalance: new Decimal(
          pointsToUsd(Number(consumedAccountBalance)),
        ),
        consumedBonusBalance: new Decimal(
          pointsToUsd(Number(consumedBonusBalance)),
        ),
      }),
    );

    return createdBet;
  }

  private async mergeBets(
    existingBet: Bet,
    createBet: CreateBet,
    transactionManager: PrismaTransactionManager,
  ): Promise<Bet> {
    const mergedMetadata = mergeBetMetadata(
      'placeBet',
      existingBet.metadata as unknown as BetMetadata,
      createBet.metadata as Record<string, any>,
    );

    const totalAmount = existingBet.betAmount.add(createBet.betAmount);

    return transactionManager.bet.update({
      where: {
        id: existingBet.id,
      },
      data: {
        betAmount: totalAmount,
        metadata: JSON.parse(JSON.stringify(mergedMetadata)),
      },
    });
  }

  translateBetProviderToCounterParty(
    provider: BetProvider,
  ): BetTransactionCounterParties {
    switch (provider) {
      case BetProviders.FUNGAMESS:
        return TransactionCounterParties.SPORTSBOOK;
      case BetProviders.SPORTS_EXCHANGE:
        return TransactionCounterParties.SPORTS_EXCHANGE;
      case BetProviders.SLOTEGRATOR_GAMES:
        return TransactionCounterParties.SLOTEGRATOR_GAMES;
      case BetProviders.SLOTEGRATOR_SPORTSBOOK:
        return TransactionCounterParties.SLOTEGRATOR_SPORTSBOOK;
      default:
        throw new Error(`Unsupported bet provider: ${provider}. 
          You must either define a new counter party or update the existing one.
        `);
    }
  }

  async pushSettleBetEvent(
    params: {
      bet: Bet;
      transaction: Transaction | undefined;
      accountBalanceCredit: Decimal;
      settleBetEvent: Record<string, any>;
      updateBetOptions?: Prisma.BetUpdateInput;
      bonusBalanceChange?: {
        bonusBalanceId: number;
        balanceChange: Decimal;
      }[];
      roundFinished?: boolean;
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<Bet> {
    if (!transactionManager) {
      return this.prismaService.$transaction(
        async (transactionManager) =>
          await this.pushSettleBetEvent(params, transactionManager),
      );
    }
    const { bet, transaction, settleBetEvent, updateBetOptions, bonusBalanceChange, accountBalanceCredit } = params;
    let mergedMetadata = mergeBetMetadata(
      'settleBet',
      bet.metadata as unknown as BetMetadata,
      settleBetEvent,
    );
    if (bonusBalanceChange) {
      mergedMetadata = mergeBetMetadata(
        'bonusBalanceChange',
        mergedMetadata,
        bonusBalanceChange,
      );
    }
    if (bet.provider === BetProviders.FUNGAMESS) {
      await transactionManager.fungamessBet.create({
        data: {
          transactionId: settleBetEvent.transactionId,
          gameId: settleBetEvent.gameId,
          betId: bet.id,
          direction: settleBetEvent.direction,
          eventType: settleBetEvent.eventType,
        },
      });
    }
    const updatedBet = await transactionManager.bet.update({
      where: {
        id: bet.id,
      },
      data: Prisma.validator<Prisma.BetUpdateInput>()({
        metadata: JSON.parse(JSON.stringify(mergedMetadata)),
        ...(updateBetOptions || {}),
      }),
    });

    const user = await transactionManager.user.findFirst({
      where: { id: updatedBet.userId },
    });

    const { accountBalance, bonusBalance } = getConsumedBalancesFromBet(updatedBet);

    if (transaction) {
      this.eventEmitter.emit(
        EventNamespace.BET_TRANSACTION,
        new BetTransactionEvent({
          betId: updatedBet.id,
          thirdPartyIdentifier: updatedBet.thirdPartyIdentifier,
          provider: updatedBet.provider as BetProvider,
          pmBtag: user?.partnerMatrixBtag || undefined,
          pmId: user?.partnerMatrixId || undefined,
          transactionId: transaction.id,
          metadata: mergedMetadata,
          status: transaction.status as TransactionStatus,
          operationType: transaction.operationType as TransactionOperationType,
          targetBalance: transaction.targetBalance as TransactionTargetBalance,
          counterParty: transaction.counterParty as TransactionCounterParty,
          referenceId: updatedBet.id,
          userId: updatedBet.userId,
          amount: transaction.amount,
          usdAmount: new Decimal(pointsToUsd(Number(transaction.amount))),
        }),
      );
    }

    this.eventEmitter.emit(
      EventNamespace.BET_SETTLED,
      new BetSettledEvent({
        amount: new Decimal(pointsToUsd(Number(updatedBet.settlementAmount))),
        grossAmount: new Decimal(
          pointsToUsd(
            Number(
              updatedBet.betAmount.add(updatedBet.settlementAmount as Decimal),
            ),
          ),
        ),
        netAmount: new Decimal(
          pointsToUsd(Number(updatedBet.settlementAmount)),
        ),
        betId: updatedBet.id,
        status: updatedBet.status as BetStatus,
        userId: updatedBet.userId,
        metadata: mergedMetadata,
        pmId: user?.partnerMatrixId || undefined,
        pmBtag: user?.partnerMatrixBtag || undefined,
        provider: updatedBet.provider as BetProvider,
        previousBalance: updatedBet.previousBalance,
        transactionId: transaction?.id || updatedBet.debitTransactionId,
        consumedAccountBalance: new Decimal(pointsToUsd(Number(accountBalance))),
        consumedBonusBalance: new Decimal(pointsToUsd(Number(bonusBalance))),
        accountBalanceIncrement: new Decimal(pointsToUsd(Number(accountBalanceCredit))),
        bonusBalanceIncrement: new Decimal(pointsToUsd(Number(bonusBalanceChange))),
        roundFinished: params.roundFinished,
      }),
    );

    return updatedBet;
  }

  private getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
