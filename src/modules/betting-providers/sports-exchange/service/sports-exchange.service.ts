import { ONE_SECOND_IN_MS } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { LockKeys } from '@common/enums/lock-keys.enum';
import { ENV } from '@common/env';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { DeadlockGuard } from '@infrastructure/database/prisma/utils/deadlock-guard';
import { AtomicLock } from '@infrastructure/lock/utils/atomic-lock';
import { BalanceService } from '@modules/balance/service/balance.service';
import {
  BetProviders,
} from '@modules/bet/enum/bet-providers.enum';
import { BetService } from '@modules/bet/service/bet.service';
import {
  CreateSessionResponse,
  PlaceSportsExchangeBet,
  SportsExchangeResponse,
  SportsExchangeTab,
  SportsExchangeUserData,
} from '@modules/betting-providers/sports-exchange/types';
import { BonusProgressionService } from '@modules/bonus/service/bonus-progression.service';
import { Roles } from '@modules/role/enum/role.enum';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { UserService } from '@modules/user/services/user.service';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';

@Injectable()
export class SportsExchangeService {
  private readonly logger = new Logger('SportsExchangeService');
  constructor(
    private readonly userService: UserService,
    private readonly balanceService: BalanceService,
    private readonly betService: BetService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly deadlockGuard: DeadlockGuard,
    private readonly atomicLock: AtomicLock,
    private readonly transactionLedgerService: TransactionLedgerService,
    private readonly prismaService: PrismaService,
    private readonly bonusProgressionService: BonusProgressionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async placeBet(
    placeSportsExchangeBet: PlaceSportsExchangeBet,
  ): Promise<SportsExchangeUserData> {
    return this.atomicLock.withLockGuard(
      async () =>
        await this.deadlockGuard.retryOnDeadlock(
          async () =>
            await this.placeBetWithoutDeadlockGuard(placeSportsExchangeBet),
        ),
      {
        lockKey: [
          [
            LockKeys.PLACE_BET_SPORTS_EXCHANGE,
            placeSportsExchangeBet.transactionId,
          ].join(':'),
        ],
        lockDuration: 5 * ONE_SECOND_IN_MS,
        context: 'placeBet',
        options: {
          retryCount: 1,
          retryDelay: 300,
        },
        conflictErrorMessage: ErrorMessages.DUPLICATE_RESOURCE,
      },
    );
  }

  private async placeBetWithoutDeadlockGuard(
    placeSportsExchangeBet: PlaceSportsExchangeBet,
  ): Promise<SportsExchangeUserData> {
    placeSportsExchangeBet.amount = new Decimal(placeSportsExchangeBet.amount);
    placeSportsExchangeBet.exposure = new Decimal(
      placeSportsExchangeBet.exposure,
    );
    const user = await this.userService.getUserInfoByPlayerTag(
      placeSportsExchangeBet.userId,
    );
    if (!user) {
      this.logger.error(
        {
          message: 'User not found in place bet',
          user_id: placeSportsExchangeBet.userId,
        },
        'placeBet',
      );
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    if (
      user.roles.some(
        (role) =>
          role.name === Roles.MASTER || role.name === Roles.SUPER_MASTER,
      )
    ) {
      this.logger.error(
        {
          message: 'Master cannot place bet',
          user_id: placeSportsExchangeBet.userId,
        },
        'placeBet',
      );
      throw new BadRequestException(ErrorMessages.MASTER_CANNOT_PLACE_BET);
    }

    await this.betService.placeBet(
      {
        exposure: placeSportsExchangeBet.exposure,
        betAmount: placeSportsExchangeBet.amount,
        provider: BetProviders.SPORTS_EXCHANGE,
        balanceChange: placeSportsExchangeBet.exposure.negated(),
        thirdPartyIdentifier: placeSportsExchangeBet.transactionId,
        userId: user.id,
        metadata: placeSportsExchangeBet,
      },
      'abort',
    );

    const newBalance = await this.balanceService.getBalanceAndBonusBalance(
      user.id,
    );

    return {
      playerTag: user.playerTag,
      balance: decimalToNumber(newBalance) || 0,
    };
  }

  async createSession(userId: string, targetTab?: string): Promise<string> {
    const user = await this.userService.getUserInfo(userId);
    if (!user) {
      this.logger.error(
        {
          message: 'User not found in create session',
          userId,
        },
        'createSession',
      );
      throw new NotFoundException('User not found');
    }

    const { data } =
      await this.httpService.axiosRef.post<CreateSessionResponse>(
        `${this.configService.getOrThrow<string>(ENV.SPORTS_EXCHANGE_BASE_URL)}/createSession`,
        {
          user_id: user.playerTag,
          client_key: this.configService.getOrThrow<string>(
            ENV.SPORTS_EXCHANGE_CLIENT_KEY,
          ),
          client_name: this.configService.getOrThrow<string>(
            ENV.SPORTS_EXCHANGE_CLIENT_NAME,
          ),
          balance: decimalToNumber(user.balance.balance),
          back_url: this.configService.getOrThrow<string>(
            ENV.SPORTS_EXCHANGE_BACK_URL,
          ),
        },
      );

    if (data.status === 0) {
      this.logger.error({
        message: 'Error creating session',
        data,
      });
      throw new InternalServerErrorException(data.message);
    }
    return this.getIframeUrl(
      data.data.url,
      targetTab as SportsExchangeTab | undefined,
    );
  }

  async createDemoSession(targetTab?: string): Promise<string> {
    const { data } =
      await this.httpService.axiosRef.post<CreateSessionResponse>(
        `${this.configService.getOrThrow<string>(ENV.SPORTS_EXCHANGE_BASE_URL)}/createSession`,
        {
          user_id: 'demo',
          client_key: this.configService.getOrThrow<string>(
            ENV.SPORTS_EXCHANGE_CLIENT_KEY,
          ),
          client_name: this.configService.getOrThrow<string>(
            ENV.SPORTS_EXCHANGE_CLIENT_NAME,
          ),
          balance: 0,
          back_url: this.configService.getOrThrow<string>(
            ENV.SPORTS_EXCHANGE_BACK_URL,
          ),
        },
      );

    if (data.status === 0) {
      this.logger.error({
        message: 'Error creating demo session',
        data,
      });
      throw new InternalServerErrorException(data.message);
    }
    return this.getIframeUrl(
      data.data.url,
      targetTab as SportsExchangeTab | undefined,
    );
  }

  async getBalance(playerTag: string): Promise<SportsExchangeResponse> {
    if (playerTag === 'demo') {
      return {
        status: true,
        message: 'Balance retrieved successfully',
        data: {
          balance: 0,
          user_id: 'demo',
        },
      } as SportsExchangeResponse;
    }

    const balance = await this.userService.getBalanceByPlayerTag(playerTag);

    if (!balance) {
      this.logger.error(
        {
          message: 'User not found in get balance',
          playerTag,
        },
        'getBalance',
      );
      throw new BadRequestException({
        message: 'User not found',
        status: false,
      } as SportsExchangeResponse);
    }
    return {
      status: true,
      message: 'Balance retrieved successfully',
      data: {
        balance: decimalToNumber(balance) || 0,
        user_id: playerTag,
      },
    } as SportsExchangeResponse;
  }

  private getIframeUrl(
    originalUrl: string,
    targetTab?: SportsExchangeTab,
  ): string {
    switch (targetTab) {
      case 'soccer':
        return originalUrl.replace(
          'home',
          process.env.SPORTS_EXCHANGE_FOOTBALL_TAB!,
        );
      case 'tennis':
        return originalUrl.replace(
          'home',
          process.env.SPORTS_EXCHANGE_TENNIS_TAB!,
        );
      case 'cricket':
        return originalUrl.replace(
          'home',
          process.env.SPORTS_EXCHANGE_CRICKET_TAB!,
        );
      default:
        return originalUrl;
    }
  }
}
