import { ONE_MINUTE_IN_MS } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { InsufficientBalanceError } from '@common/error/insufficient-ballance.error';
import { NotFoundError } from '@common/error/not-found.error';
import {
  PagePaginationRequest,
  PagePaginationResponse,
  Wrapper,
} from '@common/types';
import { NotificationCodes } from '@infrastructure/database/prisma/constants';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { TipBonusRepository } from '@infrastructure/database/prisma/types';
import { AtomicLock } from '@infrastructure/lock/utils/atomic-lock';
import { BalanceService } from '@modules/balance/service/balance.service';
import {
  BonusTriggerConfigTypes,
  BonusTriggerTypes,
} from '@modules/bonus/enum';
import { BonusDisabledError } from '@modules/bonus/error/bonus-disabled.error';
import { ProducerEventHandler } from '@modules/bonus/handlers/producer-event-handler';
import { BonusService } from '@modules/bonus/service/bonus.service';
import { BonusWithTriggers } from '@modules/bonus/types';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { InvalidTipTargetError } from '@modules/tip/error/invalid-tip-target.error';
import {
  CreateTip,
  TipReceived,
  tipReceivedSelector,
  TipSent,
  tipSentSelector,
} from '@modules/tip/types';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import { TransactionTargetBalances } from '@modules/transaction-ledger/enum/target-balance.enum';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { UserConfigService } from '@modules/user-config/service/user-config.service';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma, UserBonusBalance, UserBonusProgression } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { usdtToPoints } from '@utils/usdt-to-points';

@Injectable()
export class TipService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly bonusService: BonusService,
    @Inject(forwardRef(() => BalanceService))
    private readonly balanceService: Wrapper<BalanceService>,
    private readonly userConfigService: UserConfigService,
    private readonly atomicLock: AtomicLock,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationService: Wrapper<NotificationsService>,
    private readonly bonusProgressHandler: ProducerEventHandler,
    private readonly transactionLedgerService: TransactionLedgerService,
  ) {}

  async createTipSync(data: CreateTip): Promise<TipSent> {
    return this.atomicLock.withLockGuard(
      async () => {
        return this.createTip(data);
      },
      {
        lockKey: [`tip:${data.senderId}`],
        lockDuration: ONE_MINUTE_IN_MS, // 5 minutes
        conflictErrorMessage: ErrorMessages.TIP_IN_PROGRESS,
        context: 'createTip',
        releaseOnComplete: true,
        releaseOnFail: true,
      },
    );
  }

  /**
   * Create a tip - This method checks if the target has bonus disabled and if the sender has enough balance
   * If the conditions are met, it creates a tip bonus balance and a tip bonus record
   * !IMPORTANT: This method must be run with a lock
   * @param data
   * @throws - {@link BadRequestException} {@link ErrorMessages.USER_NOT_FOUND} - if the user is not found
   * @throws - {@link BadRequestException} {@link ErrorMessages.INVALID_TIP_TARGET} - if the sender tries to tip himself
   * @throws - {@link BadRequestException} {@link ErrorMessages.BONUS_DISABLED_FOR_USER} - if the target has bonus disabled
   * @throws - {@link BadRequestException} {@link ErrorMessages.INSUFFICIENT_BALANCE} - if the sender does not have enough balance
   * @throws - {@link BadRequestException} {@link ErrorMessages.SOMETHING_WENT_WRONG} - if something unexpected happens
   */
  async createTip(data: CreateTip): Promise<TipSent> {
    // find the user either by nickname or playerTag
    const user = await this.prismaService.user.findFirst({
      where: {
        OR: [
          {
            playerTag: data.targetUsername,
          },
          {
            nickname: data.targetUsername,
          },
        ],
      },
    });

    if (!user) {
      throw new NotFoundError(ErrorMessages.USER_NOT_FOUND);
    }

    // sender cannot tip himself
    if (data.senderId === user.id) {
      throw new InvalidTipTargetError();
    }

    // check if the target has bonus disabled
    const isTargetBonusEnabled =
      await this.userConfigService.isUserBonusEnabled(user.id);

    if (!isTargetBonusEnabled) {
      throw new BonusDisabledError();
    }

    // check if the sender has enough balance
    const senderBalance = await this.balanceService.getBalance(data.senderId);

    if (!senderBalance || senderBalance.lt(data.amount)) {
      throw new InsufficientBalanceError({
        userId: data.senderId,
        currentAmount: decimalToNumber(senderBalance),
        desiredAmount: decimalToNumber(data.amount),
        message: ErrorMessages.INSUFFICIENT_BALANCE,
      });
    }

    // find the tip bonus
    const tipBonuses = await this.bonusService.findByTriggerConfigType({
      triggerType: BonusTriggerTypes.PRODUCER,
      triggerConfigType: BonusTriggerConfigTypes.TIP,
    });

    const tipBonus = tipBonuses.at(0);

    if (!tipBonus) {
      Logger.error('Tip bonus not configured');
      throw new Error(ErrorMessages.SOMETHING_WENT_WRONG);
    }

    const tipPointsAmount = new Decimal(
      usdtToPoints(decimalToNumber(data.amount)),
    );

    const savedTip = await this.prismaService.$transaction(
      async (transactionManager) => {
        // create a tip bonus balance
        const { savedProgressBonuses } = await this.createTipBonus(
          user.id,
          tipPointsAmount,
          tipBonus,
          transactionManager,
        );

        if (!savedProgressBonuses) {
          throw new Error(ErrorMessages.SOMETHING_WENT_WRONG);
        }
        // create a tip bonus record
        const createdTip = await this.getClient(transactionManager).create({
          data: {
            amount: tipPointsAmount, // amount of the tip
            senderId: data.senderId,
            userId: user.id,
            bonusProgressId: savedProgressBonuses.id,
          },
          select: tipSentSelector.select,
        });
        // decrement the sender balance and create a transaction ledger record
        await this.decrementSenderBalance(
          data.senderId,
          tipPointsAmount,
          createdTip.id,
          transactionManager,
        );
        await this.transactionLedgerService.create(
          {
            userId: data.senderId,
            operationType: TransactionOperationTypes.CREDIT,
            counterParty: TransactionCounterParties.TIP_BONUS,
            referenceId: createdTip.id.toString(),
            targetBalance: TransactionTargetBalances.BONUS_BALANCE,
            amount: tipPointsAmount,
            status: TransactionStatuses.SUCCESS,
          },
          transactionManager,
        );
        return createdTip;
      },
    );

    const senderPlayerTag = await this.prismaService.user.findUnique({
      where: {
        id: data.senderId,
      },
      select: {
        playerTag: true,
      },
    });
    if (senderPlayerTag) {
      this.notificationService.createNotification(
        user.id,
        NotificationCodes.TIP_RECEIVED,
        undefined,
        {
          amount: data.amount,
          sender: senderPlayerTag.playerTag,
        },
      );
    }
    return savedTip;
  }

  private async decrementSenderBalance(
    senderId: string,
    amount: Decimal,
    tipBonusId: number,
    transactionManager: Prisma.TransactionClient,
  ): Promise<void> {
    await this.balanceService.decrementUserBalance(
      senderId,
      amount,
      transactionManager,
    );
    await this.transactionLedgerService.create({
      amount,
      counterParty: TransactionCounterParties.TIP_BONUS,
      operationType: TransactionOperationTypes.DEBIT,
      referenceId: tipBonusId.toString(),
      userId: senderId,
      status: TransactionStatuses.SUCCESS,
      targetBalance: TransactionTargetBalances.ACCOUNT_BALANCE,
    },
    transactionManager,
    );
  }

  /**
   * Create a tip bonus balance and a record in the transaction ledger
   * @param userId
   * @param amount
   * @param tipBonusId
   * @param transactionManager
   * @returns
   */
  private async createTipBonus(
    userId: string,
    amount: Decimal,
    tipBonus: BonusWithTriggers,
    transactionManager: Prisma.TransactionClient,
  ): Promise<{
    savedInstantBonuses: UserBonusBalance | null;
    savedProgressBonuses: UserBonusProgression | null;
  }> {
    const { savedInstantBonuses, savedProgressBonuses } =
      await this.bonusProgressHandler.handleCustomTrigger(
        [tipBonus],
        {
          event: {
            amount: decimalToNumber(amount),
            bonusId: tipBonus.id,
            userId,
          },
          type: BonusTriggerConfigTypes.TIP,
          userId,
        },
        {
          suppressNotifications: true,
        },
        transactionManager,
      );
    return {
      savedInstantBonuses: savedInstantBonuses?.at(0) ?? null,
      savedProgressBonuses: savedProgressBonuses?.at(0) ?? null,
    };
  }

  async getAllTipsSent(
    userId: string,
    query: {
      filters?: Prisma.RewardWhereInput;
      pagination: PagePaginationRequest;
    },
  ): Promise<PagePaginationResponse<TipSent>> {
    const { filters, pagination } = query;
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const count = await this.prismaService.tipBonus.count({
      where: { ...(filters || {}), senderId: userId, deletedAt: null },
    });

    const data = await this.prismaService.tipBonus.findMany({
      where: { ...(filters || {}), senderId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: tipSentSelector.select,
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total: count, page, limit };
  }

  async getAllTipsReceived(
    userId: string,
    query: {
      filters?: Prisma.RewardWhereInput;
      pagination: PagePaginationRequest;
    },
  ): Promise<PagePaginationResponse<TipReceived>> {
    const { filters, pagination } = query;
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const count = await this.prismaService.tipBonus.count({
      where: { ...(filters || {}), userId, deletedAt: null },
    });

    const data = await this.prismaService.tipBonus.findMany({
      where: { ...(filters || {}), userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      select: tipReceivedSelector.select,
      take: limit,
    });

    return { data, total: count, page, limit };
  }

  private getClient(_: PrismaTransactionManager): TipBonusRepository {
    return this.prismaService.tipBonus;
  }
}
