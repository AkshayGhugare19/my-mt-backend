import { ErrorMessages } from '@common/enums/error-messages.enum';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BalanceService } from '@modules/balance/service/balance.service';
import { BetProviders } from '@modules/bet/enum/bet-providers.enum';
import { BetNotFoundError } from '@modules/bet/error/bet-not-found.error';
import { BetService } from '@modules/bet/service/bet.service';
import { BetMetadata } from '@modules/bet/types';
import { FungamessFundsEventDto } from '@modules/betting-providers/fungamess/dto/funds-event.dto';
import { FungamessBetEventPriority } from '@modules/betting-providers/fungamess/enum/bet-event-priority.enum';
import {
  FungamessEventType,
  FungamessEventTypes,
} from '@modules/betting-providers/fungamess/enum/event-types.enum';
import { DuplicateBetPlacementError } from '@modules/betting-providers/fungamess/error/duplicate-bet-placement.error';
import {
  FungamessAggregateBetStatus,
  FungamessBalanceResponse,
  FungamessResponse,
} from '@modules/betting-providers/fungamess/types';
import { GamesService } from '@modules/games/service/games.service';
import { Injectable, Logger } from '@nestjs/common';
import { Bet } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';

@Injectable()
export class FungamessFundsService {
  private readonly logger = new Logger(FungamessFundsService.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly betService: BetService,
    private readonly balanceService: BalanceService,
    private readonly gamesService: GamesService,
  ) {}

  async placeBet(
    userId: string,
    placeBetEvent: FungamessFundsEventDto,
  ): Promise<FungamessResponse<FungamessBalanceResponse>> {
    await this.verifyDuplicateTransaction(placeBetEvent);

    await this.prismaService.$transaction(async (transactionManager) => {
      const bet = await this.betService.placeBet(
        {
          betAmount: placeBetEvent.amount,
          provider: BetProviders.FUNGAMESS,
          thirdPartyIdentifier: placeBetEvent.eventId,
          userId,
          metadata: placeBetEvent,
          balanceChange: placeBetEvent.amount,
        },
        'merge',
        transactionManager,
      );
      return await transactionManager.fungamessBet.create({
        data: {
          transactionId: placeBetEvent.transactionId,
          gameId: placeBetEvent.gameId,
          betId: bet.id,
          direction: placeBetEvent.direction,
          eventType: placeBetEvent.eventType,
        },
      });
    });

    // we don't have to await this promise. it's a fire and forget operation, not critical if it fails.
    this.gamesService.updateFavoriteGamesFromBet(userId, placeBetEvent.gameId);

    const balance = await this.balanceService.getBalanceAndBonusBalance(userId);
    return {
      status: true,
      balance: decimalToNumber(balance) || 0,
    };
  }

  private async verifyDuplicateTransaction(
    betEvent: FungamessFundsEventDto,
  ): Promise<void> {
    const existingTransaction = await this.prismaService.fungamessBet.findFirst(
      {
        where: {
          transactionId: betEvent.transactionId,
        },
        include: {
          bet: true,
        },
      },
    );
    if (
      existingTransaction &&
      existingTransaction.eventType === betEvent.eventType
    ) {
      this.logger.error(
        {
          message: 'Duplicate transaction',
          betEvent,
        },
        'verifyDuplicateTransaction',
      );
      throw new DuplicateBetPlacementError(
        'Duplicate transaction id',
        existingTransaction.transactionId,
        'transactionId',
      );
    }
  }

  private async getAggregateBetStatus(
    bet: Bet,
    settleEvent: FungamessFundsEventDto,
  ): Promise<FungamessAggregateBetStatus> {
    const placeBet = (bet.metadata as unknown as BetMetadata).placeBet;

    if (!Array.isArray(placeBet)) {
      return {
        isAggregate: false,
        aggregateAmount: placeBet.amount,
        canSettle: true,
        status: null,
      };
    }

    const settleBet = (bet.metadata as unknown as BetMetadata).settleBet;
    const settledArray = Array.isArray(settleBet)
      ? [...settleBet, settleEvent]
      : settleBet
        ? [settleBet, settleEvent]
        : [settleEvent];

    const isFinished = settledArray.length >= placeBet.length;
    const { betResult, status } = this.calculateTotalBetResult(settledArray);

    return {
      isAggregate: true,
      aggregateAmount: betResult,
      canSettle: isFinished,
      status: isFinished ? status : null,
    };
  }

  private calculateTotalBetResult(settledArray: FungamessFundsEventDto[]): {
    betResult: any;
    status: any;
  } {
    return settledArray.reduce(
      (acc, betResult) => {
        const resultPriority =
          FungamessBetEventPriority[betResult.eventType as FungamessEventType];
        const currentBetPriority =
          FungamessBetEventPriority[acc.status as FungamessEventType];
        const newStatus =
          // A higher priority means a lower priority number
          resultPriority < currentBetPriority
            ? (betResult.eventType as FungamessEventType)
            : acc.status;
        return {
          status: newStatus,
          betResult: acc.betResult.plus(betResult.amount),
        };
      },
      {
        betResult: new Decimal(0),
        status: FungamessEventTypes.LOSS as FungamessEventType,
      },
    );
  }

  private async getUserBet(
    settleBetEvent: FungamessFundsEventDto,
    userId: string,
    context: string,
  ): Promise<Bet> {
    const initialBet = await this.betService.findByThirdPartyIdentifier({
      thirdPartyIdentifier: settleBetEvent.eventId,
    });

    if (!initialBet) {
      this.logger.error(
        {
          message: ErrorMessages.BET_NOT_FOUND,
          settleBetEvent,
        },
        context,
      );
      throw new BetNotFoundError({
        betId: settleBetEvent.eventId,
        provider: BetProviders.FUNGAMESS,
        thirdPartyIdentifier: settleBetEvent.eventId,
      });
    }

    if (initialBet.userId !== userId) {
      this.logger.error(
        {
          message: ErrorMessages.BET_USER_ID_MISMATCH,
          settleBetEvent,
          expectedUserId: userId,
        },
        context,
      );
      throw new BetNotFoundError({
        betId: settleBetEvent.eventId,
        userId: initialBet.userId,
        provider: BetProviders.FUNGAMESS,
        thirdPartyIdentifier: settleBetEvent.eventId,
      });
    }
    return initialBet;
  }
}
