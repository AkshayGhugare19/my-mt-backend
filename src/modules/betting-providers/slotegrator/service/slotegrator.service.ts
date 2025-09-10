/* eslint-disable sonarjs/no-duplicate-string */
import { PrismaService, PrismaTransactionManager } from '@infrastructure/database/prisma/prisma.service';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SlotegratorApiClient, SlotegratorGame } from './client';
import { randomUUID } from 'crypto';
import { ENV } from '@common/env';
import { BalanceService } from '@modules/balance/service/balance.service';
import { SlotegratorError } from '../error';
import { BetService } from '@modules/bet/service/bet.service';
import { BetProvider, BetProviders } from '@modules/bet/enum/bet-providers.enum';
import { Decimal } from '@prisma/client/runtime/library';
import { GamesService } from '@modules/games/service/games.service';
import { BetStatuses } from '@modules/bet/enum/bet-status.enum';
import { AtomicLock } from '@infrastructure/lock/utils/atomic-lock';
import { LockKeys } from '@common/enums/lock-keys.enum';
import { ONE_SECOND_IN_MS } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { Bet } from '@prisma/client';
import { RefundBet } from '@modules/balance/types';
import { NotFoundError } from '@common/error/not-found.error';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { createGameSlug } from '@modules/betting-providers/utils/format-slug';
import { BetMetadata } from '@modules/bet/types';

export interface CreateSessionInput {
  slug: string;
  userId?: string;
  demo: boolean;
  userNickname?: string;
  return_url?: string;
}

export interface CreateSportsBookSessionInput {
  userId: string;
  userNickname: string;
  language: string;
}

export interface PlaceGameBetInput {
  amount: number;
  currency: string;
  gameId: string;
  playerId: string;
  transactionId: string;
  sessionId?: string;
  type: string;
  roundId?: string;
  roundFinished?: boolean;
}

export interface PlaceGameBetResult {
  balance: Decimal;
  transaction: string;
}

export interface SettleGameBetWinInput {
  amount: number;
  currency: string;
  gameId: string;
  playerId: string;
  transactionId: string;
  sessionId?: string;
  type: string;
  roundId?: string;
  roundFinished?: boolean;
}

export interface SettleGameBetWinResult {
  balance: Decimal;
  transaction: string;
}

export interface SettleGameBetRefundInput {
  amount: number;
  currency: string;
  gameId: string;
  playerId: string;
  transactionId: string;
  sessionId?: string;
  type?: string;
  betTransactionId: string;
  roundId?: string;
  roundFinished?: boolean;
}

export interface SettleGameBetRefundResult {
  balance: Decimal;
  transaction: string;
}

export interface SettleGameBetRollbackInput {
  currency: string;
  gameId: string;
  playerId: string;
  transactionId: string;
  rollbackTransactions: {
    action: 'bet' | 'win' | 'refund';
    transactionId: string;
    amount: number;
  }[];
  sessionId?: string;
}

export interface SettleGameBetRollbackResult {
  balance: Decimal;
  transaction: string;
  rollbackTransactionIds: string[];
}

export interface PlaceSportsBookBetInput {
  amount: number;
  currency: string;
  playerId: string;
  transactionId: string;
  sessionId?: string;
  sportsbookUuid: string;
  betslipId: string;
  betslip: any;
}

export interface PlaceSportsBookBetResult {
  balance: Decimal;
  transaction: string;
}

export interface SettleSportsBookBetWinInput {
  amount: number;
  currency: string;
  playerId: string;
  transactionId: string;
  sessionId?: string;
  sportsbookUuid: string;
  betslipId: string;
  betslip: any;
}

export interface SettleSportsBookBetWinResult {
  balance: Decimal;
  transaction: string;
}

export interface SlotegratorSportsBookRefundInput {
  amount: number;
  currency: string;
  playerId: string;
  transactionId: string;
  sessionId?: string;
  sportsbookUuid: string;
  betslipId: string;
  refTransactionId: string;
  type: string;
}

export interface SlotegratorSportsBookRefundResult {
  balance: Decimal;
  transaction: string;
}

export interface SlotegratorSportsBookRollbackInput {
  amount: number;
  currency: string;
  playerId: string;
  transactionId: string;
  betTransactionId: string;
  betslipId: string;
  parentTransactionId: string;
}

export interface SlotegratorSportsBookRollbackResult {
  balance: Decimal;
  transaction: string;
}

type ProcessedTransactionCategory = 'bet' | 'settlement' | 'refund' | 'rollback';

function getProcessedTransactionCategoryKey(category: ProcessedTransactionCategory): string {
  switch (category) {
    case 'bet':
      return 'b';
    case 'settlement':
      return 's';
    case 'refund':
      return 'r';
    case 'rollback':
      return 'rb';
  }
}

type ProcessedTransaction = {
  id: string;
  encoded: string;
  category: ProcessedTransactionCategory;
};

function generateProcessedTransaction(category: ProcessedTransactionCategory): ProcessedTransaction {
  const id = randomUUID();

  return {
    id,
    encoded: encodeProcessedTransaction(category, id),
    category,
  };
}

function encodeProcessedTransaction(category: ProcessedTransactionCategory, id: string): string {
  return `${getProcessedTransactionCategoryKey(category)}:${id}`;
}

function decodeProcessedTransaction(encoded: string): ProcessedTransaction {
  const [category, id] = encoded.split(':');

  switch (category) {
    case 'b':
      return {
        category: 'bet' as ProcessedTransactionCategory,
        encoded,
        id,
      };
    case 's':
      return {
        category: 'settlement' as ProcessedTransactionCategory,
        encoded,
        id,
      };
    case 'r':
      return {
        category: 'refund' as ProcessedTransactionCategory,
        encoded,
        id,
      };
    case 'rb':
      return {
        category: 'rollback' as ProcessedTransactionCategory,
        encoded,
        id,
      };
  }

  throw new SlotegratorError('INTERNAL_ERROR', 'invalid processed transaction');
}

function isEncodedProcessedTransaction(category: ProcessedTransactionCategory): (encoded: string) => boolean {
  const key = getProcessedTransactionCategoryKey(category);
  return (encoded: string) => encoded.startsWith(`${key}:`);
}

function findOrGenerateProcessedTransaction(
  category: ProcessedTransactionCategory,
  processedTransactionIds: string[],
  nth: number = 0,
): ProcessedTransaction {
  const processedTransactions = processedTransactionIds.filter(isEncodedProcessedTransaction(category));

  const processedTransaction = processedTransactions[nth];

  if (processedTransaction) {
    return decodeProcessedTransaction(processedTransaction);
  }

  return generateProcessedTransaction(category);
}

@Injectable()
export class SlotegratorService {
  private readonly client: SlotegratorApiClient;
  private readonly sportsBookClient: SlotegratorApiClient;
  private readonly _logger = new Logger(SlotegratorService.name);
  private readonly currency: string;
  private readonly sportsBookCurrency: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly balanceService: BalanceService,
    private readonly betService: BetService,
    private readonly gameService: GamesService,
    private readonly atomicLock: AtomicLock,
    @InjectRedis()
    private readonly redis: Redis,
  ) {
    this.client = new SlotegratorApiClient(
      this.configService.getOrThrow(ENV.SLOTEGRATOR_MERCHANT_ID),
      this.configService.getOrThrow(ENV.SLOTEGRATOR_MERCHANT_KEY),
      this.configService.getOrThrow(ENV.SLOTEGRATOR_BASE_API_URL),
      this.gameService,
    );
    this.sportsBookClient = new SlotegratorApiClient(
      this.configService.getOrThrow(ENV.SLOTEGRATOR_SPORTSBOOK_MERCHANT_ID),
      this.configService.getOrThrow(ENV.SLOTEGRATOR_SPORTSBOOK_MERCHANT_KEY),
      this.configService.getOrThrow(ENV.SLOTEGRATOR_SPORTSBOOK_BASE_API_URL),
      this.gameService,
    );
    this.currency = this.configService.getOrThrow(ENV.SLOTEGRATOR_CURRENCY);
    this.sportsBookCurrency = this.configService.getOrThrow(ENV.SLOTEGRATOR_SPORTSBOOK_CURRENCY);
  }

  async runSelfTest(): Promise<void> {
    await this.client.runSelfTest();
  }

  async startSportsBookSelfTest(sessionId: string): Promise<any> {
    return await this.sportsBookClient.startSportsBookSelfTest(sessionId);
  }

  async getSportsBookSelfTestResult(taskId: string): Promise<any> {
    return this.sportsBookClient.getSportsBookSelfTestResults(taskId);
  }

  async importGames(): Promise<SlotegratorGame[]> {
    const allGames = await this.client.games().toArray();
    const allGamesIds = new Set(allGames.map((game) => game.uuid));

    const existingGames = await this.prismaService.slotegratorGame.findMany({});
    const existingGamesIds = new Set(existingGames.map((game) => game.uuid));

    const unavailableGames = existingGames.filter((existingGame) => {
      return existingGame.available && !allGamesIds.has(existingGame.uuid);
    });

    const fixupGames = existingGames.filter((existingGame) => {
      const game = allGames.find((g) => g.uuid === existingGame.uuid);
      return game && (game.image !== existingGame.image || game.name !== existingGame.name);
    });

    await this.prismaService.slotegratorGame.updateMany({
      where: {
        uuid: {
          in: unavailableGames.map((game) => game.uuid),
        },
      },
      data: {
        available: false,
      },
    });
    this._logger.log(`marked ${unavailableGames.length} games as unavailable`);

    const availableGames = existingGames.filter((existingGame) => {
      return !existingGame.available && allGamesIds.has(existingGame.uuid);
    });
    await this.prismaService.slotegratorGame.updateMany({
      where: {
        uuid: {
          in: availableGames.map((game) => game.uuid),
        },
      },
      data: {
        available: true,
      },
    });
    this._logger.log(`marked ${availableGames.length} games as available`);

    const newGames = allGames.filter((game) => {
      return !existingGamesIds.has(game.uuid);
    });

    const games = await this.prismaService.slotegratorGame.createMany({
      data: newGames.map((game) => ({
        ...game,
        slug: createGameSlug(game.provider, game.name),
        oldSlug: game.uuid,
      })),
    });
    this._logger.log(`created ${games.count} new games`);

    this._logger.log(`fixing ${fixupGames.length} games (images, names)`);
    let fixupCount = 0;
    for (const game of fixupGames) {
      const updateGameSrc = allGames.find((g) => g.uuid === game.uuid);
      if (!updateGameSrc) {
        continue;
      }

      fixupCount++;

      await this.prismaService.slotegratorGame.update({
        where: {
          uuid: game.uuid,
        },
        data: {
          image: updateGameSrc.image,
          name: updateGameSrc.name,
        },
      });
    }

    this._logger.log(`fixed ${fixupCount} games (images, names)`);
    return allGames;
  }

  async createSession(input: CreateSessionInput): Promise<string> {
    if (input.demo) {
      const demoDisabled = await this.redis.hget('slotegrator:demo', input.slug);
      if (demoDisabled) {
        throw new BadRequestException('Demo mode unavailable');
      }
    }

    const logId: string = randomUUID();
    const game = await this.prismaService.slotegratorGame.findFirst({
      where: {
        OR: [{ oldSlug: input.slug }, { slug: input.slug }],
      },
    });

    if (!game) {
      throw new Error(`game with id ${input.slug} not found`);
    }

    if (!input.demo && !input.userId) {
      throw new NotFoundError(ErrorMessages.NOT_FOUND, 'User', input.userId);
    }

    if (input.demo) {
      this._logger.log(
        {
          game_uuid: game.uuid,
        },
        'Init Demo Game Slotegrator',
      );

      const session = await this.client
        .initDemoGame({
          game_uuid: game.uuid,
        })
        .catch(async () => {
          await this.redis.hset('slotegrator:demo', game.uuid, 'true');
          await this.redis.expire('slotegrator:demo', 60 * 60 * 2);
          return null;
        });

      if (!session) {
        throw new BadRequestException('Demo mode unavailable');
      }

      this._logger.log(
        {
          url: session,
          params: {
            game_uuid: game.uuid,
            log_id: logId,
          },
        },
        `Slotegrator Session: Demo Game: ${logId}`,
      );
      return session.url;
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        id: input.userId,
      },
    });

    if (!user) {
      throw new NotFoundError(ErrorMessages.NOT_FOUND, 'User', input.userId);
    }

    if (game.hasLobby) {
      this._logger.log(`Init Lobby Game Slotegrator: ${logId}`, {
        game_uuid: game.uuid,
        currency: this.currency,
        log_id: logId,
      });

      const lobbySession = await this.client.initLobby({
        game_uuid: game.uuid,
        currency: this.currency,
      });

      const selectedLobby = lobbySession.lobby.find((l) => l.isOpen);
      if (!selectedLobby) {
        throw new Error('no open lobby found');
      }

      this._logger.debug(selectedLobby, `Init Lobby Game Slotegrator: ${logId}`);

      const sessionId = randomUUID();

      this._logger.log('Init Game Slotegrator', {
        session_id: sessionId,
        lobby_data: selectedLobby.lobbyData,
        game_uuid: game.uuid,
        player_id: input.userId,
        player_name: input.userNickname,
        currency: this.currency,
        return_url: input.return_url,
      });

      const session = await this.client.initGame({
        session_id: sessionId,
        lobby_data: selectedLobby.lobbyData,
        game_uuid: game.uuid,
        player_id: user.id,
        player_name: user.playerTag,
        currency: this.currency,
        return_url: input.return_url,
      });

      this._logger.log(
        {
          url: session,
          params: {
            session_id: sessionId,
            lobby_data: selectedLobby.lobbyData,
            game_uuid: game.uuid,
            player_id: input.userId,
            player_name: input.userNickname,
            currency: this.currency,
            return_url: input.return_url,
            log_id: logId,
          },
        },
        `Slotegrator Session: Lobby Game: ${logId}`,
      );

      return session.url;
    }

    const sessionId = randomUUID();

    this._logger.log(
      {
        game_uuid: game.uuid,
        session_id: sessionId,
        player_id: input.userId,
        player_name: input.userNickname,
        currency: this.currency,
        return_url: input.return_url,
        log_id: logId,
      },
      `Init Game Slotegrator: ${logId}`,
    );

    const session = await this.client.initGame({
      session_id: sessionId,
      game_uuid: game.uuid,
      player_id: user.id,
      player_name: user.playerTag,
      currency: this.currency,
      return_url: input.return_url,
    });

    this._logger.log(
      {
        url: session,
        params: {
          session_id: sessionId,
          game_uuid: game.uuid,
          player_id: input.userId,
          player_name: input.userNickname,
          currency: this.currency,
          return_url: input.return_url,
          log_id: logId,
        },
      },
      `Slotegrator Session: Game: ${logId}`,
    );

    return session.url;
  }

  async createSportsBookSession(input: CreateSportsBookSessionInput): Promise<{
    url: string;
    token: string;
  }> {
    const sportsboooks = await this.sportsBookClient.listSportsbooks();
    const selectedSportsbook = sportsboooks[0];
    if (!selectedSportsbook) {
      throw new Error('no sportsbooks found');
    }

    return this.sportsBookClient.initSportsbook({
      currency: this.sportsBookCurrency,
      player_id: input.userId,
      player_name: input.userNickname,
      session_id: randomUUID(),
      sportsbook_uuid: selectedSportsbook.uuid,
      language: input.language,
    });
  }

  public async getUserBalance(userId: string): Promise<Decimal> {
    const balance = await this.balanceService.getBalanceAndBonusBalance(userId);
    if (!balance) {
      throw new SlotegratorError('INTERNAL_ERROR', 'User not found');
    }

    return balance;
  }

  public async placeGameBet(input: PlaceGameBetInput): Promise<PlaceGameBetResult> {
    return this.atomicLock.withLockGuard(async () => await this.placeGameBetSyncronized(input), {
      lockKey: [[LockKeys.SLOTEGRATOR_BALANCE_UPDATE_GAME_BET, input.playerId].join(':')],
      lockDuration: 5 * ONE_SECOND_IN_MS,
      context: 'placeGameBet',
      options: {
        retryCount: 25,
        retryDelay: 55,
      },
      conflictErrorMessage: ErrorMessages.DUPLICATE_RESOURCE,
    });
  }

  private async placeGameBetSyncronized(input: PlaceGameBetInput): Promise<PlaceGameBetResult> {
    const existingGameBet = await this.prismaService.slotegratorGameBet.findFirst({
      where: {
        transactionId: input.transactionId,
        bet: {
          userId: input.playerId,
        },
      },
    });

    const processedTransaction = findOrGenerateProcessedTransaction(
      'bet',
      existingGameBet?.processedTransactionIds ?? [],
    );

    if (existingGameBet) {
      return {
        transaction: processedTransaction.id,
        balance: await this.getUserBalance(input.playerId),
      };
    }

    const amount = new Decimal(input.amount).mul(100);
    const balance = await this.getUserBalance(input.playerId);

    if (balance.lt(amount)) {
      this._logger.error(`insufficient funds ${balance} < ${amount}`);
      throw new SlotegratorError('INSUFFICIENT_FUNDS');
    }

    const transactionId = await this.prismaService.$transaction(async (transactionManager) => {
      const bet = await this.betService.placeBet(
        {
          betAmount: amount,
          provider: BetProviders.SLOTEGRATOR_GAMES,
          thirdPartyIdentifier: input.transactionId,
          userId: input.playerId,
          metadata: input,
          balanceChange: amount,
        },
        'merge',
        transactionManager,
      );
      await transactionManager.slotegratorGameBet.create({
        data: {
          transactionId: input.transactionId,
          gameId: input.gameId,
          betId: bet.id,
          roundId: input.roundId,
          roundFinished: input.roundFinished,
          sessionId: input.sessionId,
          type: input.type,
          processedTransactionIds: [processedTransaction.encoded],
        },
      });

      return processedTransaction.id;
    });

    this.gameService.updateFavoriteGamesFromBet(input.playerId, input.gameId);

    if (input.roundFinished) {
      await this.settleGameBetWinSyncronized({
        ...input,
        type: 'win',
        transactionId: `${input.transactionId}-auto-win`,
        amount: 0,
      });
    }

    return {
      transaction: transactionId,
      balance: await this.getUserBalance(input.playerId),
    };
  }

  public async settleGameBetWin(input: SettleGameBetWinInput): Promise<SettleGameBetWinResult> {
    return this.atomicLock.withLockGuard(async () => await this.settleGameBetWinSyncronized(input), {
      lockKey: [[LockKeys.SLOTEGRATOR_BALANCE_UPDATE_GAME_SETTLE, input.playerId].join(':')],
      lockDuration: 5 * ONE_SECOND_IN_MS,
      context: 'settleGameBetWin',
      options: {
        retryCount: 25,
        retryDelay: 55,
      },
      conflictErrorMessage: ErrorMessages.DUPLICATE_RESOURCE,
    });
  }

  private async settleGameBetWinSyncronized(input: SettleGameBetWinInput): Promise<SettleGameBetWinResult> {
    const gameBet = await this.prismaService.slotegratorGameBet.findFirst({
      where: {
        roundId: input.roundId,
        bet: {
          userId: input.playerId,
        },
      },
      include: { bet: true },
    });

    if (!gameBet) {
      if (input.amount === 0) {
        const processedTransaction = generateProcessedTransaction('bet');

        return {
          transaction: processedTransaction.id,
          balance: await this.getUserBalance(input.playerId),
        };
      }

      throw new SlotegratorError('INTERNAL_ERROR', 'Bet not found');
    }

    if (gameBet.settlementTransactionIds.includes(input.transactionId)) {
      const index = gameBet.settlementTransactionIds.indexOf(input.transactionId);
      const processedTransaction = findOrGenerateProcessedTransaction(
        'settlement',
        gameBet.processedTransactionIds,
        index,
      );

      return {
        transaction: processedTransaction.id,
        balance: await this.getUserBalance(input.playerId),
      };
    }

    const amount = new Decimal(input.amount).mul(100);

    const transactionId = await this.prismaService.$transaction(async (transactionManager) => {
      const processedTransaction = generateProcessedTransaction('settlement');
      const { transaction, bonusBalanceChange, accountBalanceCredit } = await this.balanceService.settleBet(
        {
          betId: gameBet.betId,
          creditAmount: amount,
          provider: BetProviders.SLOTEGRATOR_GAMES,
          userId: input.playerId,
          updateStatistics: true,
          betValue: gameBet.bet.betAmount,
          metadata: gameBet.bet.metadata as unknown as Record<string, any>,
        },
        transactionManager,
      );
      await transactionManager.slotegratorGameBet.update({
        where: {
          id: gameBet.id,
        },
        data: {
          settlementTransactionIds: {
            push: input.transactionId,
          },
          roundFinished: input.roundFinished,
          processedTransactionIds: {
            push: processedTransaction.encoded,
          },
        },
      });

      const rawSettleMetadata = ((gameBet.bet.metadata as any) ?? {}).settleBet ?? [];
      const settleMetadata: SettleGameBetWinInput[] = Array.isArray(rawSettleMetadata)
        ? [...rawSettleMetadata, input]
        : [rawSettleMetadata, input];

      const totalWinValue = settleMetadata.reduce((acc, val) => {
        const amount = new Decimal(val.amount).mul(100);
        return acc.add(amount);
      }, new Decimal(0));

      const settlementAmount = totalWinValue.minus(gameBet.bet.betAmount);

      const lost = settlementAmount.lt(0);
      await this.betService.pushSettleBetEvent(
        {
          bet: gameBet.bet,
          transaction,
          settleBetEvent: input,
          accountBalanceCredit,
          updateBetOptions: {
            status: lost ? BetStatuses.LOSS : BetStatuses.WIN,
            settlementAmount,
          },
          bonusBalanceChange,
          roundFinished: input.roundFinished,
        },
        transactionManager,
      );

      return processedTransaction.id;
    });

    return {
      transaction: transactionId,
      balance: await this.getUserBalance(input.playerId),
    };
  }

  public async settleGameBetRefund(input: SettleGameBetRefundInput): Promise<SettleGameBetRefundResult> {
    return this.atomicLock.withLockGuard(async () => await this.settleGameBetRefundSyncronized(input), {
      lockKey: [[LockKeys.SLOTEGRATOR_BALANCE_UPDATE_GAME_SETTLE, input.playerId].join(':')],
      lockDuration: 5 * ONE_SECOND_IN_MS,
      context: 'settleGameBetRefund',
      options: {
        retryCount: 25,
        retryDelay: 55,
      },
      conflictErrorMessage: ErrorMessages.DUPLICATE_RESOURCE,
    });
  }

  private async settleGameBetRefundSyncronized(input: SettleGameBetRefundInput): Promise<SettleGameBetRefundResult> {
    const gameBet = await this.prismaService.slotegratorGameBet.findFirst({
      where: {
        transactionId: input.betTransactionId,
        bet: {
          userId: input.playerId,
        },
      },
      include: { bet: true },
    });

    if (!gameBet) {
      const processedTransaction = generateProcessedTransaction('refund');
      return {
        balance: await this.getUserBalance(input.playerId),
        transaction: processedTransaction.id,
      };
    }

    if (gameBet.refundTransactionIds.length !== 0) {
      const processedTransaction = findOrGenerateProcessedTransaction('refund', gameBet.processedTransactionIds);

      return {
        transaction: processedTransaction.id,
        balance: await this.getUserBalance(input.playerId),
      };
    }

    const transactionId = await this.prismaService.$transaction(async (transactionManager) => {
      const processedTransaction = generateProcessedTransaction('refund');

      const { transaction, accountBalanceCredit } = await this.balanceService.refundBet(
        {
          betId: gameBet.betId,
          creditAmount: gameBet.bet.betAmount,
          provider: BetProviders.SLOTEGRATOR_GAMES,
          userId: input.playerId,
          updateStatistics: false,
          betValue: gameBet.bet.betAmount,
          thirdPartyIdentifier: input.betTransactionId,
          metadata: gameBet.bet.metadata as unknown as Record<string, any>,
        },
        transactionManager,
      );

      const balanceData = await transactionManager.balance.findUnique({
        where: {
          userId: input.playerId,
        },
      });
      if (balanceData) {
        const newVolumePlayed = balanceData.volumePlayed.sub(gameBet.bet.betAmount);
        await transactionManager.balance.update({
          where: {
            userId: input.playerId,
          },
          data: {
            volumePlayed: newVolumePlayed,
          },
        });
      }

      await transactionManager.slotegratorGameBet.update({
        where: {
          id: gameBet.id,
        },
        data: {
          refundTransactionIds: {
            push: input.transactionId,
          },
          processedTransactionIds: {
            push: processedTransaction.encoded,
          },
        },
      });
      await this.betService.pushSettleBetEvent(
        {
          bet: gameBet.bet,
          transaction,
          settleBetEvent: input,
          accountBalanceCredit,
          updateBetOptions: {
            status: BetStatuses.CANCELLED,
            settlementAmount: new Decimal(0),
          },
          roundFinished: input.roundFinished,
        },
        transactionManager,
      );

      return processedTransaction.id;
    });

    return {
      transaction: transactionId,
      balance: await this.getUserBalance(input.playerId),
    };
  }

  public async settleGameBetRollback(input: SettleGameBetRollbackInput): Promise<SettleGameBetRollbackResult> {
    return this.atomicLock.withLockGuard(async () => await this.settleGameBetRollbackSyncronized(input), {
      lockKey: [[LockKeys.SLOTEGRATOR_BALANCE_UPDATE_GAME_SETTLE, input.playerId].join(':')],
      lockDuration: 5 * ONE_SECOND_IN_MS,
      context: 'settleGameBetRollback',
      options: {
        retryCount: 25,
        retryDelay: 55,
      },
      conflictErrorMessage: ErrorMessages.DUPLICATE_RESOURCE,
    });
  }

  private async settleGameBetRollbackSyncronized(
    input: SettleGameBetRollbackInput,
  ): Promise<SettleGameBetRollbackResult> {
    const rollbackTransactionIds: string[] = [];

    for (const rollbackTransaction of input.rollbackTransactions) {
      try {
        if (rollbackTransaction.action === 'bet') {
          await this.rollbackBetTransaction(rollbackTransaction.transactionId, input.playerId, input.transactionId);
        } else if (rollbackTransaction.action === 'win') {
          await this.rollbackWinTransaction(rollbackTransaction.transactionId, input.playerId, input.transactionId);
        } else if (rollbackTransaction.action === 'refund') {
          await this.rollbackRefundTransaction(rollbackTransaction.transactionId, input.playerId);
        }

        rollbackTransactionIds.push(rollbackTransaction.transactionId);
      } catch (error) {
        this._logger.error(
          `error during rollback for ${rollbackTransaction.action} ${rollbackTransaction.transactionId} ${rollbackTransaction.amount}`,
          error,
        );
      }
    }

    const trigger = `rt:${input.transactionId}`;
    const gameBet = await this.prismaService.slotegratorGameBet.findFirst({
      where: {
        rollbackTransactionIds: {
          has: trigger,
        },
        bet: {
          userId: input.playerId,
        },
      },
    });
    if (!gameBet) {
      throw new SlotegratorError('INTERNAL_ERROR', 'Bet not found');
    }

    const index = gameBet.rollbackTransactionIds.filter((x) => x.startsWith('rt:')).indexOf(trigger);
    const processedTransaction = findOrGenerateProcessedTransaction('rollback', gameBet.processedTransactionIds, index);

    return {
      balance: await this.getUserBalance(input.playerId),
      transaction: processedTransaction.id,
      rollbackTransactionIds,
    };
  }

  private async rollbackBetTransaction(
    transactionToRollback: string,
    playerId: string,
    triggerTransaction: string,
  ): Promise<void> {
    const gameBet = await this.prismaService.slotegratorGameBet.findFirst({
      where: {
        transactionId: transactionToRollback,
        bet: {
          userId: playerId,
        },
      },
      include: { bet: true },
    });

    if (!gameBet) {
      throw new Error('missing game bet');
    }

    if (gameBet.rollbackTransactionIds.includes(transactionToRollback)) {
      // throw new Error('bet already rolled back');
      return;
    }

    await this.prismaService.$transaction(async (transactionManager) => {
      const trigger = `rt:${triggerTransaction}`;
      const processedTransaction = generateProcessedTransaction('rollback');

      await this.balanceService.rollbackBetPlacing(
        {
          userId: playerId,
          metadata: gameBet.bet.metadata as unknown as Record<string, any>,
          betId: gameBet.betId,
          creditAmount: gameBet.bet.betAmount,
          provider: gameBet.bet.provider as BetProvider,
          updateStatistics: true,
          thirdPartyIdentifier: transactionToRollback,
          betValue: gameBet.bet.betAmount,
        } satisfies RefundBet,
        transactionManager,
      );
      const currentStatistics = await this.balanceService.getBalanceAnd(
        playerId,
        {
          volumePlayed: true,
        },
        transactionManager,
      );
      await this.balanceService.updateStatistics(playerId, {
        volumePlayed: (currentStatistics?.volumePlayed || new Decimal(0)).add(gameBet.bet.betAmount),
      });
      await transactionManager.slotegratorGameBet.update({
        where: {
          id: gameBet.id,
        },
        data: {
          rollbackTransactionIds: {
            push: gameBet.rollbackTransactionIds.includes(trigger)
              ? [transactionToRollback]
              : [trigger, transactionToRollback],
          },
          processedTransactionIds: {
            push: gameBet.rollbackTransactionIds.includes(trigger) ? [] : [processedTransaction.encoded],
          },
        },
      });

      await transactionManager.bet.update({
        where: {
          id: gameBet.betId,
        },
        data: {
          status: BetStatuses.CANCELLED,
        },
      });
    });
  }

  private async rollbackWinTransaction(
    transactionToRollback: string,
    playerId: string,
    triggerTransaction: string,
  ): Promise<void> {
    const gameBet = await this.prismaService.slotegratorGameBet.findFirst({
      where: {
        settlementTransactionIds: {
          has: transactionToRollback,
        },
        bet: {
          userId: playerId,
        },
      },
      include: { bet: true },
    });

    if (!gameBet || !gameBet.bet.settlementAmount) {
      throw new Error('missing game bet or settlement amount');
    }

    if (gameBet.rollbackTransactionIds.includes(transactionToRollback)) {
      // throw new Error('bet already rolled back');
      return;
    }

    await this.prismaService.$transaction(async (transactionManager) => {
      const trigger = `rt:${triggerTransaction}`;
      const processedTransaction = generateProcessedTransaction('rollback');

      await this.balanceService.decrementUserBalance(
        playerId,
        (gameBet.bet.settlementAmount ?? new Decimal(0)).add(gameBet.bet.betAmount),
        transactionManager,
      );
      await this.decrementWinStatisticsOnRollback(gameBet.bet, transactionManager);
      await transactionManager.slotegratorGameBet.update({
        where: {
          id: gameBet.id,
        },
        data: {
          rollbackTransactionIds: {
            push: gameBet.rollbackTransactionIds.includes(trigger)
              ? [transactionToRollback]
              : [trigger, transactionToRollback],
          },
          processedTransactionIds: {
            push: gameBet.rollbackTransactionIds.includes(trigger) ? [] : [processedTransaction.encoded],
          },
        },
      });

      await transactionManager.bet.update({
        where: {
          id: gameBet.betId,
        },
        data: {
          status: BetStatuses.CANCELLED,
        },
      });
    });
  }

  private async rollbackRefundTransaction(transactionId: string, playerId: string): Promise<void> {
    this._logger.log('rollback refund', {
      transactionId,
      playerId,
    });

    throw new Error('cannot rollback refund');
  }

  public async placeSportsBookBet(input: PlaceSportsBookBetInput): Promise<PlaceSportsBookBetResult> {
    return await this.placeSportsBookBetSyncronized(input);
  }

  public async commitSportsBookBet(input: PlaceSportsBookBetInput): Promise<Pick<PlaceSportsBookBetResult, 'balance'>> {
    return await this.commitSportsBookBetSyncronized(input);
  }

  private async commitSportsBookBetSyncronized(input: PlaceSportsBookBetInput): Promise<Pick<PlaceSportsBookBetResult, 'balance'>> {
    // Validate user's bet size

    const gameBet = await this.prismaService.slotegratorSportsBookBet.findFirst({
      where: {
        gameId: input.betslipId,
        bet: {
          userId: input.playerId,
        },
      },
      include: { bet: true },
    });

    if (!gameBet || !gameBet.bet) {
      throw new SlotegratorError('INTERNAL_ERROR', 'Bet not found');
    }

    const bet = gameBet.bet;

    const metadata = bet.metadata as unknown as BetMetadata<PlaceSportsBookBetInput>;
    metadata.placeBet = {
      ...input,
    } as PlaceSportsBookBetInput;

    await this.prismaService.bet.update({
      where: {
        id: bet.id,
      },
      data: {
        metadata: metadata as unknown as Record<string, any>,
      },
    });

    return {
      balance: await this.getUserBalance(input.playerId),
    };
  }

  private async placeSportsBookBetSyncronized(input: PlaceSportsBookBetInput): Promise<PlaceSportsBookBetResult> {
    // Validate user's bet size

    const existingSportsBookBet = await this.prismaService.slotegratorSportsBookBet.findFirst({
      where: {
        transactionId: input.transactionId,
        bet: {
          userId: input.playerId,
        },
      },
    });

    const processedTransaction = findOrGenerateProcessedTransaction(
      'bet',
      existingSportsBookBet?.processedTransactionIds ?? [],
    );

    if (existingSportsBookBet) {
      return {
        transaction: processedTransaction.id,
        balance: await this.getUserBalance(input.playerId),
      };
    }

    const amount = new Decimal(input.amount).mul(100);
    const balance = await this.getUserBalance(input.playerId);

    if (balance.lt(amount)) {
      this._logger.error(`insufficient funds ${balance} < ${amount}`);
      throw new SlotegratorError('INSUFFICIENT_FUNDS');
    }

    const { transactionId, bet } = await this.prismaService.$transaction(async (transactionManager) => {
      const bet = await this.betService.placeBet(
        {
          betAmount: amount,
          provider: BetProviders.SLOTEGRATOR_SPORTSBOOK,
          thirdPartyIdentifier: input.transactionId,
          userId: input.playerId,
          metadata: input,
          balanceChange: amount,
        },
        'merge',
        transactionManager,
      );
      await transactionManager.slotegratorSportsBookBet.create({
        data: {
          transactionId: input.transactionId,
          betId: bet.id,
          gameId: input.betslipId,
          sessionId: input.sessionId,
          processedTransactionIds: [processedTransaction.encoded],
        },
      });

      return { transactionId: processedTransaction.id, bet };
    });

    if (!bet) {
      throw new Error('Bet was not created inside transaction.');
    }

    return {
      transaction: transactionId,
      balance: await this.getUserBalance(input.playerId),
    };
  }

  public async settleSportsBookBetWin(input: SettleSportsBookBetWinInput): Promise<SettleSportsBookBetWinResult> {
    return this.atomicLock.withLockGuard(async () => await this.settleSportsBookBetWinSyncronized(input), {
      lockKey: [[LockKeys.SLOTEGRATOR_BALANCE_UPDATE_GAME_SETTLE, input.playerId].join(':')],
      lockDuration: 5 * ONE_SECOND_IN_MS,
      context: 'settleSportsBookBetWin',
      options: {
        retryCount: 25,
        retryDelay: 55,
      },
      conflictErrorMessage: ErrorMessages.DUPLICATE_RESOURCE,
    });
  }

  private async settleSportsBookBetWinSyncronized(
    input: SettleSportsBookBetWinInput,
  ): Promise<SettleSportsBookBetWinResult> {
    const gameBet = await this.prismaService.slotegratorSportsBookBet.findFirst({
      where: {
        gameId: input.betslipId,
        bet: {
          userId: input.playerId,
        },
      },
      include: { bet: true },
    });

    if (!gameBet) {
      if (input.amount === 0) {
        const processedTransaction = generateProcessedTransaction('bet');

        return {
          transaction: processedTransaction.id,
          balance: await this.getUserBalance(input.playerId),
        };
      }

      throw new SlotegratorError('INTERNAL_ERROR', 'Bet not found');
    }

    if (gameBet.settlementTransactionIds.includes(input.transactionId)) {
      const index = gameBet.settlementTransactionIds.indexOf(input.transactionId);
      const processedTransaction = findOrGenerateProcessedTransaction(
        'settlement',
        gameBet.processedTransactionIds,
        index,
      );

      return {
        transaction: processedTransaction.id,
        balance: await this.getUserBalance(input.playerId),
      };
    }

    if (gameBet.bet.status !== BetStatuses.PENDING) {
      throw new SlotegratorError('INTERNAL_ERROR', 'Bet already settled');
    }

    const amount = new Decimal(input.amount).mul(100);

    const transactionId = await this.prismaService.$transaction(
      async (transactionManager) => {
        const processedTransaction = generateProcessedTransaction('settlement');

        const { transaction, accountBalanceCredit, bonusBalanceChange } = await this.balanceService.settleBet(
          {
            betId: gameBet.betId,
            creditAmount: amount,
            provider: BetProviders.SLOTEGRATOR_SPORTSBOOK,
            userId: input.playerId,
            updateStatistics: true,
            betValue: gameBet.bet.betAmount,
            metadata: gameBet.bet.metadata as unknown as Record<string, any>,
          },
          transactionManager,
        );
        await transactionManager.slotegratorSportsBookBet.update({
          where: {
            id: gameBet.id,
          },
          data: {
            settlementTransactionIds: {
              push: input.transactionId,
            },
            processedTransactionIds: {
              push: processedTransaction.encoded,
            },
          },
        });

        // const rawSettleMetadata =
        //   ((gameBet.bet.metadata as any) ?? {}).settleBet ?? [];
        // const settleMetadata: SettleSportsBookBetWinInput[] = Array.isArray(
        //   rawSettleMetadata,
        // )
        //   ? [...rawSettleMetadata, input]
        //   : [rawSettleMetadata, input];

        // const totalWinValue = settleMetadata.reduce((acc, val) => {
        //   return acc.add(val.amount * 100);
        // }, new Decimal(0));

        const settlementAmount = amount.minus(gameBet.bet.betAmount);
        const lost = settlementAmount.lt(0);
        await this.betService.pushSettleBetEvent(
          {
            bet: gameBet.bet,
            transaction,
            accountBalanceCredit,
            settleBetEvent: input,
            updateBetOptions: {
              status: lost ? BetStatuses.LOSS : BetStatuses.WIN,
              settlementAmount,
            },
            bonusBalanceChange,
          },
          transactionManager,
        );

        return processedTransaction.id;
      },
      {
        isolationLevel: 'Serializable',
      },
    );

    return {
      transaction: transactionId,
      balance: await this.getUserBalance(input.playerId),
    };
  }

  public async settleSportsBookBetRefund(
    input: SlotegratorSportsBookRefundInput,
  ): Promise<SlotegratorSportsBookRefundResult> {
    return this.atomicLock.withLockGuard(async () => await this.settleSportsBookBetRefundSyncronized(input), {
      lockKey: [[LockKeys.SLOTEGRATOR_BALANCE_UPDATE_GAME_SETTLE, input.playerId].join(':')],
      lockDuration: 5 * ONE_SECOND_IN_MS,
      context: 'settleSportsBookBetRefund',
      options: {
        retryCount: 25,
        retryDelay: 55,
      },
      conflictErrorMessage: ErrorMessages.DUPLICATE_RESOURCE,
    });
  }

  private async settleSportsBookBetRefundSyncronized(
    input: SlotegratorSportsBookRefundInput,
  ): Promise<SlotegratorSportsBookRefundResult> {
    const gameBet = await this.prismaService.slotegratorSportsBookBet.findFirst({
      where: {
        transactionId: input.refTransactionId,
        bet: {
          userId: input.playerId,
        },
      },
      include: { bet: true },
    });

    if (!gameBet) {
      throw new SlotegratorError('INTERNAL_ERROR', 'Bet not found');
      // const processedTransaction = generateProcessedTransaction('refund');
      // return {
      //   balance: await this.getUserBalance(input.playerId),
      //   transaction: processedTransaction.id,
      // };
    }

    if (gameBet.refundTransactionIds.length !== 0) {
      const processedTransaction = findOrGenerateProcessedTransaction('refund', gameBet.processedTransactionIds);

      return {
        transaction: processedTransaction.id,
        balance: await this.getUserBalance(input.playerId),
      };
    }

    if (gameBet.bet.status !== BetStatuses.PENDING) {
      throw new SlotegratorError('INTERNAL_ERROR', 'Bet already settled');
    }

    const refundAmount = new Decimal(input.amount).mul(100);

    const transactionId = await this.prismaService.$transaction(async (transactionManager) => {
      const processedTransaction = generateProcessedTransaction('refund');

      const { transaction, accountBalanceCredit } = await this.balanceService.refundBet(
        {
          betId: gameBet.betId,
          creditAmount: refundAmount,
          provider: BetProviders.SLOTEGRATOR_SPORTSBOOK,
          userId: input.playerId,
          updateStatistics: true,
          betValue: gameBet.bet.betAmount,
          thirdPartyIdentifier: input.refTransactionId,
          metadata: gameBet.bet.metadata as unknown as Record<string, any>,
        },
        transactionManager,
      );
      await transactionManager.slotegratorSportsBookBet.update({
        where: {
          id: gameBet.id,
        },
        data: {
          refundTransactionIds: {
            push: input.transactionId,
          },
          processedTransactionIds: {
            push: processedTransaction.encoded,
          },
        },
      });
      await this.betService.pushSettleBetEvent(
        {
          bet: gameBet.bet,
          transaction,
          accountBalanceCredit,
          settleBetEvent: input,
          updateBetOptions: {
            status: input.type === 'cash_out' ? BetStatuses.CASH_OUT : BetStatuses.REFUNDED,
            settlementAmount: refundAmount.minus(gameBet.bet.betAmount),
          },
        },
        transactionManager,
      );

      return processedTransaction.id;
    });

    return {
      transaction: transactionId,
      balance: await this.getUserBalance(input.playerId),
    };
  }

  public async sportsBookBetSettled(playerId: string, gameId: string): Promise<boolean> {
    const gameBet = await this.prismaService.slotegratorSportsBookBet.findFirst({
      where: {
        gameId,
        bet: {
          userId: playerId,
        },
      },
      include: {
        bet: true,
      },
    });

    if (!gameBet) {
      return false;
    }

    await this.prismaService.slotegratorSportsBookBet.update({
      where: {
        id: gameBet.id,
      },
      data: {
        settled: true,
      },
    });

    return gameBet.bet.status !== BetStatuses.PENDING;
  }

  public async settleSportsBookBetRollback(
    input: SlotegratorSportsBookRollbackInput,
  ): Promise<SlotegratorSportsBookRollbackResult> {
    return this.atomicLock.withLockGuard(async () => await this.settleSportsBookBetRollbackSyncronized(input), {
      lockKey: [[LockKeys.SLOTEGRATOR_BALANCE_UPDATE_GAME_SETTLE, input.playerId].join(':')],
      lockDuration: 5 * ONE_SECOND_IN_MS,
      context: 'settleSportsBookBetRollback',
      options: {
        retryCount: 25,
        retryDelay: 55,
      },
      conflictErrorMessage: ErrorMessages.DUPLICATE_RESOURCE,
    });
  }

  private async settleSportsBookBetRollbackSyncronized(
    input: SlotegratorSportsBookRollbackInput,
  ): Promise<SlotegratorSportsBookRollbackResult> {
    const sportsBet = await this.prismaService.slotegratorSportsBookBet.findFirst({
      where: {
        transactionId: input.betTransactionId,
        bet: {
          userId: input.playerId,
        },
      },
    });

    if (!sportsBet) {
      throw new SlotegratorError('INTERNAL_ERROR', 'Bet not found');
    }

    const trigger = `rt:${input.transactionId}`;
    if (sportsBet.rollbackTransactionIds.includes(trigger)) {
      const processedTransaction = findOrGenerateProcessedTransaction('rollback', sportsBet.processedTransactionIds);

      return {
        balance: await this.getUserBalance(input.playerId),
        transaction: processedTransaction.id,
      };
    }

    const rollbackCategory = sportsBet.refundTransactionIds.includes(input.parentTransactionId)
      ? 'refund'
      : sportsBet.settlementTransactionIds.includes(input.parentTransactionId)
        ? 'settlement'
        : null;

    if (rollbackCategory === 'refund') {
      await this.rollbackSportsBookRefund(
        input.parentTransactionId,
        input.playerId,
        input.transactionId,
        new Decimal(input.amount).mul(100),
      );
    } else if (rollbackCategory === 'settlement') {
      await this.rollbackSportsBookWin(input.parentTransactionId, input.playerId, input.transactionId);
    } else {
      throw new SlotegratorError('INTERNAL_ERROR', `Can't rollback ${rollbackCategory}`);
    }

    const updatedBet = await this.prismaService.slotegratorSportsBookBet.findFirst({
      where: {
        transactionId: input.betTransactionId,
        bet: {
          userId: input.playerId,
        },
      },
    });
    if (!updatedBet) {
      throw new SlotegratorError('INTERNAL_ERROR', 'Bet not found');
    }

    const updatedProcessedTransaction = findOrGenerateProcessedTransaction(
      'rollback',
      updatedBet.processedTransactionIds,
    );

    return {
      balance: await this.getUserBalance(input.playerId),
      transaction: updatedProcessedTransaction.id,
    };
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async rollbackSportsBookWin(
    transactionToRollback: string,
    playerId: string,
    triggerTransaction: string,
  ): Promise<void> {
    const gameBet = await this.prismaService.slotegratorSportsBookBet.findFirst({
      where: {
        settlementTransactionIds: {
          has: transactionToRollback,
        },
        bet: {
          userId: playerId,
        },
      },
      include: { bet: true },
    });

    if (!gameBet || !gameBet.bet.settlementAmount) {
      throw new Error('missing game bet or settlement amount');
    }

    if (gameBet.settled) {
      throw new SlotegratorError('INTERNAL_ERROR', 'Bet already settled');
    }

    if (gameBet.rollbackTransactionIds.includes(transactionToRollback)) {
      // throw new SlotegratorError('INTERNAL_ERROR', 'Bet already rolled back');
      return;
    }

    await this.prismaService.$transaction(async (transactionManager) => {
      const trigger = `rt:${triggerTransaction}`;
      const processedTransaction = generateProcessedTransaction('rollback');

      const settleIndex = gameBet.settlementTransactionIds.findIndex((x) => x === transactionToRollback);
      const existingTransaction = findOrGenerateProcessedTransaction(
        'refund',
        gameBet.processedTransactionIds,
        settleIndex,
      );

      const processedTransactionIds = gameBet.processedTransactionIds.filter((x) => x !== existingTransaction.encoded);
      if (!gameBet.rollbackTransactionIds.includes(trigger)) {
        processedTransactionIds.push(processedTransaction.encoded);
      }

      await this.balanceService.decrementUserBalance(
        playerId,
        (gameBet.bet.settlementAmount ?? new Decimal(0)).add(gameBet.bet.betAmount),
        transactionManager,
        false, // do not update volume played
        true, // allow negative balance
      );
      await this.decrementWinStatisticsOnRollback(gameBet.bet, transactionManager);
      await transactionManager.slotegratorSportsBookBet.update({
        where: {
          id: gameBet.id,
        },
        data: {
          settlementTransactionIds: {
            set: gameBet.settlementTransactionIds.filter((x) => x !== transactionToRollback),
          },
          rollbackTransactionIds: {
            push: gameBet.rollbackTransactionIds.includes(trigger)
              ? [transactionToRollback]
              : [trigger, transactionToRollback],
          },
          processedTransactionIds: {
            set: processedTransactionIds,
          },
        },
      });

      await transactionManager.bet.update({
        where: {
          id: gameBet.betId,
        },
        data: {
          status: BetStatuses.PENDING,
        },
      });
    });
  }

  private async decrementWinStatisticsOnRollback(
    bet: Bet,
    transactionManager: PrismaTransactionManager,
  ): Promise<void> {
    const settlementAmount = bet.settlementAmount;
    if (!settlementAmount) return;
    const currentStatistics = await this.balanceService.getBalanceAnd(
      bet.userId,
      {
        totalLoss: true,
        totalWin: true,
        volumePlayed: true,
      },
      transactionManager,
    );
    await this.balanceService.updateStatistics(
      bet.userId,
      {
        volumePlayed: currentStatistics?.volumePlayed
          ? currentStatistics.volumePlayed.sub(settlementAmount)
          : undefined,
      },
      transactionManager,
    );
  }

  private async rollbackSportsBookRefund(
    transactionToRollback: string,
    playerId: string,
    triggerTransaction: string,
    amount: Decimal,
  ): Promise<void> {
    const gameBet = await this.prismaService.slotegratorSportsBookBet.findFirst({
      where: {
        refundTransactionIds: {
          has: transactionToRollback,
        },
        bet: {
          userId: playerId,
        },
      },
      include: { bet: true },
    });

    if (!gameBet) {
      throw new SlotegratorError('INTERNAL_ERROR', 'Bet not found');
    }

    if (gameBet.settled) {
      throw new SlotegratorError('INTERNAL_ERROR', 'Bet already settled');
    }

    if (gameBet.rollbackTransactionIds.includes(transactionToRollback)) {
      // throw new SlotegratorError('INTERNAL_ERROR', 'Bet already rolled back');
      return;
    }

    await this.prismaService.$transaction(async (transactionManager) => {
      const trigger = `rt:${triggerTransaction}`;
      const processedTransaction = generateProcessedTransaction('rollback');

      await this.balanceService.rollbackRefundBet(
        {
          userId: playerId,
          bet: gameBet.bet as Bet,
          balanceChange: amount,
          referenceId: triggerTransaction,
          provider: this.betService.translateBetProviderToCounterParty(gameBet.bet.provider as BetProvider),
          betAmount: gameBet.bet.betAmount,
        },
        transactionManager,
      );

      const refundIndex = gameBet.refundTransactionIds.findIndex((x) => x === transactionToRollback);
      const existingTransaction = findOrGenerateProcessedTransaction(
        'refund',
        gameBet.processedTransactionIds,
        refundIndex,
      );

      const processedTransactionIds = gameBet.processedTransactionIds.filter((x) => x !== existingTransaction.encoded);
      if (!gameBet.rollbackTransactionIds.includes(trigger)) {
        processedTransactionIds.push(processedTransaction.encoded);
      }

      await transactionManager.slotegratorSportsBookBet.update({
        where: {
          id: gameBet.id,
        },
        data: {
          refundTransactionIds: {
            set: gameBet.refundTransactionIds.filter((x) => x !== transactionToRollback),
          },
          rollbackTransactionIds: {
            push: gameBet.rollbackTransactionIds.includes(trigger)
              ? [transactionToRollback]
              : [trigger, transactionToRollback],
          },
          processedTransactionIds: {
            set: processedTransactionIds,
          },
        },
      });

      await transactionManager.bet.update({
        where: {
          id: gameBet.betId,
        },
        data: {
          status: BetStatuses.PENDING,
        },
      });
    });
  }

  async populateGameCategory(): Promise<void> {
    await this.prismaService.gameCategory.createMany({
      data: [
        { id: '1', name: 'slots' },
        { id: '2', name: 'live_casino' },
        { id: '3', name: 'table_games' },
        { id: '4', name: 'web3' },
        { id: '5', name: 'poker' },
        { id: '6', name: 'other' },
      ],
      skipDuplicates: true,
    });

    this._logger.log('GameCategories have been added.');
  }

  async addGameCategory(): Promise<void> {
    const existingGames = await this.prismaService.slotegratorGame.findMany({
      select: {
        uuid: true,
        type: true,
        provider: true,
      },
    });

    let count = 0;

    for (const game of existingGames) {
      const categoryId = this.gameService.getGameCategoryId(game.uuid, game.type, game.provider);

      await this.prismaService.slotegratorGame.update({
        where: { uuid: game.uuid },
        data: { gameCategoryId: categoryId },
      });

      count++;
    }

    this._logger.log(`Updated ${count} games`);
  }

  private getClient(transactionManager?: PrismaTransactionManager): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
