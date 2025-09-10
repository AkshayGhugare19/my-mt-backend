import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import {
  BaseGameReportItem,
  GameBetReportItem,
  SportsExchangeBetReportItem,
  SportsbookBetReportItem,
  SportsbookExtendedBetReportItem,
} from '@modules/admin/types';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BetProviders } from '../enum/bet-providers.enum';
import { Bet, Prisma } from '@prisma/client';
import { decimalToNumber } from '@utils/decimal-do-number';
import { BetStatus, BetStatuses } from '../enum/bet-status.enum';
import { PermissionService } from '@modules/permission/service/permission.service';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import {
  SlotegratorSportsBookBetslip,
  SlotegratorSportsBookBetslipBet,
  SportsbookBetslip,
  SportsbookBetslipBet,
  SportsbookSettleBetMetadata,
} from '@modules/betting-providers/fungamess/types';
import { BetReportItem, betReportSelect } from '@modules/bet/types';

@Injectable()
export class BetReportsService {
  private readonly logger = new Logger(BetReportsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  async getBetEvent(
    betId: string,
    requesterId: string,
  ): Promise<
    SportsbookExtendedBetReportItem | (BaseGameReportItem & { type: 'base' })
  > {
    const bet = await this.prismaService.bet.findUnique({
      where: {
        id: betId,
      },
    });

    if (!bet) {
      throw new NotFoundException(ErrorMessages.BET_NOT_FOUND);
    }

    const permissions =
      await this.permissionService.getUserPermissions(requesterId);

    if (permissions.includes(Permissions.READ_VIP_OWN)) {
      const belongsToMaster = await this.prismaService.user.findFirst({
        where: {
          id: bet.userId,
          masterId: requesterId,
        },
      });
      if (!belongsToMaster) {
        throw new NotFoundException(ErrorMessages.BET_NOT_FOUND);
      }
    }

    const data = bet.metadata as Record<string, any>;

    const isSportsBookGame = data?.placeBet?.extraData?.betslip;
    const isSlotegratorSportsBookGame = data?.placeBet?.betslip;

    if (isSportsBookGame) {
      // TODO: This is bad...
      return await this.parseSportsbookBet(data, bet);
    }

    if (isSlotegratorSportsBookGame) {
      // TODO: This is bad...
      return await this.parseSlotegratorSportsbookBet(data, bet);
    }

    // TODO: This is bad...
    return {
      id: bet.id,
      type: 'base',
      previousBalance: decimalToNumber(bet.previousBalance),
      amount: decimalToNumber(bet.betAmount),
      date: bet.createdAt,
      settlement: decimalToNumber(bet.settlementAmount),
      status: bet.status,
    } as BaseGameReportItem & { type: 'base' };
  }

  private async parseSportsbookBet(
    data: Record<string, any>,
    bet: Bet,
  ): Promise<SportsbookExtendedBetReportItem> {
    const betslip = data?.placeBet?.extraData?.betslip as SportsbookBetslip;
    const bets = betslip.bets;
    const results: SportsbookSettleBetMetadata['extraData'] | undefined =
      data?.settleBet?.extraData;
    const isCashOut = results?.is_cashout;
    const mappedBets: (SportsbookBetslipBet & { status: string })[] = bets.map(
      (bet) => {
        const result = results?.selections?.find(
          (result) => result.event_id === bet.event_id,
        );
        return {
          ...bet,
          status: result?.status ?? BetStatuses.PENDING,
        };
      },
    );

    const game = await this.prismaService.fungamessGame.findUnique({
      where: {
        gameId: parseInt(data.placeBet.gameId),
      },
    });

    return {
      id: bet.id,
      date: bet.createdAt,
      amount: decimalToNumber(bet.betAmount),
      settlement: decimalToNumber(bet.settlementAmount),
      previousBalance: decimalToNumber(bet.previousBalance),
      status: bet.status,
      isCashOut: isCashOut ?? false,
      game: game?.name ?? '-',
      betId: bet.thirdPartyIdentifier,
      extraData: {
        bets: mappedBets,
        potentialWin: betslip.sum,
        potentialComboboostWin: betslip.sum,
      },
      type: 'sportsbook',
    } as SportsbookExtendedBetReportItem;
  }

  private async parseSlotegratorSportsbookBet(
    data: Record<string, any>,
    bet: Bet,
  ): Promise<SportsbookExtendedBetReportItem> {
    const betslip = data.placeBet.betslip as SlotegratorSportsBookBetslip;
    const results = data?.settleBet?.betslip as SlotegratorSportsBookBetslip;
    const bets = betslip.items;
    // const isCashOut = results?.is_cashout;
    const mappedBets: ({
      event_id: string;
      status: string;
      provider_uuid: string;
      id: string;
      live: boolean;
    } & SlotegratorSportsBookBetslipBet)[] = bets.map((bet) => {
      // const result = bet.find(
      //   (result: any) => result.event_id === bet.event_id,
      // );
      const result = results?.items?.find(r => r.event_id === bet.event_id) ?? undefined
      const isNumberStatus = !Number.isNaN(Number(result?.status));
      return {
        id: bet.uuid,
        live: bet.parameters.is_live,
        event_id: bet.event_id,
        provider_uuid: bet.provider_uuid,
        ...bet.parameters,
        status: (!isNumberStatus ? result?.status : betslip?.status) ?? BetStatuses.PENDING,
      };
    });

    // const game = await this.prismaService.slotegratorSportsBookBet.findUnique({
    //   where: {
    //     gameId: parseInt(data.placeBet.gameId),
    //   },
    // });

    return {
      type: 'sportsbook',
      // isCashOut: isCashOut ?? false,
      isCashOut: false,
      betId: bet.thirdPartyIdentifier,
      id: bet.id,
      // game: game?.name ?? '-',
      date: bet.createdAt,
      transactionId: betslip?.provider_betslip_id,
      amount: decimalToNumber(bet.betAmount),
      settlement: decimalToNumber(bet.settlementAmount),
      previousBalance: decimalToNumber(bet.previousBalance),
      status: bet.status,
      extraData: {
        bets: mappedBets,
      },
    } as SportsbookExtendedBetReportItem;
  }

  async getUserGamesBets(
    userId: string,
    page: number = 1,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ data: GameBetReportItem[]; count: number }> {
    const bets = await this.prismaService.bet.findMany({
      where: {
        userId,
        OR: [
          {
            provider: BetProviders.FUNGAMESS,
            metadata: {
              path: ['placeBet', 'extraData', 'betslip'],
              not: Prisma.AnyNull,
            },
          },
          { provider: BetProviders.SLOTEGRATOR_GAMES },
        ],
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },

      include: {
        FungamessBets: true,
        SlotegratorGameBets: { include: { game: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const count = await this.prismaService.bet.count({
      where: {
        userId,
        OR: [
          {
            provider: BetProviders.FUNGAMESS,
            metadata: {
              path: ['placeBet', 'extraData', 'betslip'],
              not: Prisma.AnyNull,
            },
          },
          { provider: BetProviders.SLOTEGRATOR_GAMES },
        ],
      },
    });

    const thirdPartyIdentifier = bets.map((bet) => bet.thirdPartyIdentifier);

    // Fetching related transactions
    const transactions = await this.prismaService.transaction.findMany({
      where: {
        referenceId: {
          in: thirdPartyIdentifier,
        },
        operationType: 'DEBIT'
      },
      select: {
        referenceId: true,
        targetBalance: true,
        amount: true,
      },
    });

    const transactionMap = transactions.reduce(
      (acc, transaction) => {
        if (!acc[transaction.referenceId]) {
          acc[transaction.referenceId] = [];
        }
        acc[transaction.referenceId].push({
          targetBalance: transaction.targetBalance,
          amount: decimalToNumber(transaction.amount),
        });
        return acc;
      },
      {} as Record<string, { targetBalance: string | null; amount: number }[]>,
    );

    const gameIds = bets
      .flatMap((bet) => bet.FungamessBets ?? [])
      .map((bet) => parseInt(bet.gameId))
      .filter((gameId) => !isNaN(gameId));

    const fungamesGames = await this.prismaService.fungamessGame.findMany({
      where: {
        gameId: {
          in: gameIds,
        },
      },
    });

    return {
      data: bets.map((bet) => {
        const foundGame =
          bet.provider === BetProviders.FUNGAMESS
            ? fungamesGames.find(
              (game) =>
                game.gameId === parseInt(bet.FungamessBets?.[0]?.gameId),
            )?.name
            : bet.SlotegratorGameBets[0]?.game?.name;

        const transactionsForBet = transactionMap[bet.thirdPartyIdentifier];

        const targetBalance =
          transactionsForBet?.map((tx) => ({
            balance: tx.targetBalance,
            amount: tx.amount,
          })) || [];

        return {
          id: bet.id,
          date: bet.createdAt,
          amount: decimalToNumber(bet.betAmount),
          settlement: decimalToNumber(bet.settlementAmount),
          targetBalance,
          status: bet.status,
          previousBalance: decimalToNumber(bet.previousBalance),
          game: foundGame ?? '-',
          betId: bet.thirdPartyIdentifier,
          roundId: bet?.SlotegratorGameBets[0]?.roundId,
          gameId: bet?.SlotegratorGameBets[0]?.gameId,
          casinoPlayerId: bet?.userId,
          sessionId: bet?.SlotegratorGameBets[0]?.sessionId,
        };
      }),
      count,
    };
  }

  async getUserSportbookBets(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: SportsbookBetReportItem[]; count: number }> {
    const bets = await this.prismaService.bet.findMany({
      where: {
        userId,
        OR: [
          {
            provider: BetProviders.FUNGAMESS,
            metadata: {
              path: ['placeBet', 'extraData', 'betslip'], // TODO: this is shit
              not: Prisma.AnyNull,
            },
          },
          { provider: BetProviders.SLOTEGRATOR_SPORTSBOOK },
        ],
      },
      include: {
        FungamessBets: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const count = await this.prismaService.bet.count({
      where: {
        userId,
        OR: [
          {
            provider: BetProviders.FUNGAMESS,
            metadata: {
              path: ['placeBet', 'extraData', 'betslip'], // TODO: this is shit
              not: Prisma.AnyNull,
            },
          },
          { provider: BetProviders.SLOTEGRATOR_SPORTSBOOK },
        ],
      },
    });

    const thirdPartyIdentifier = bets.map((bet) => bet.thirdPartyIdentifier);

    // Fetching related transactions
    const transactions = await this.prismaService.transaction.findMany({
      where: {
        referenceId: {
          in: thirdPartyIdentifier,
        },
        operationType: 'DEBIT'
      },
      select: {
        referenceId: true,
        targetBalance: true,
        amount: true,
      },
    });

    const transactionMap = transactions.reduce(
      (acc, transaction) => {
        if (!acc[transaction.referenceId]) {
          acc[transaction.referenceId] = [];
        }
        acc[transaction.referenceId].push({
          targetBalance: transaction.targetBalance,
          amount: decimalToNumber(transaction.amount),
        });
        return acc;
      },
      {} as Record<string, { targetBalance: string | null; amount: number }[]>,
    );

    type TempBetslip = {
      bets?: {
        sport_name?: string;
        competitor_name?: string[];
        tournament_name?: string;
        outcome_name?: string;
      }[];
    };

    const gameIds = bets
      .flatMap((bet) => bet.FungamessBets ?? [])
      .map((bet) => parseInt(bet.gameId))
      .filter((gameId) => !isNaN(gameId));

    const games = await this.prismaService.fungamessGame.findMany({
      where: {
        gameId: {
          in: gameIds,
        },
      },
    });

    return {
      data: bets.map((item) => {
        const data = item.metadata as any; // TODO: this is shit
        const betslip = data?.placeBet?.extraData?.betslip as
          | TempBetslip
          | undefined;

        const transactionsForBet = transactionMap[item.thirdPartyIdentifier];

        const targetBalance =
          transactionsForBet?.map((tx) => ({
            balance: tx.targetBalance,
            amount: tx.amount,
          })) || [];

        const bet = betslip?.bets?.[0];
        const isCashOut = data?.settleBet?.extraData?.is_cashout || false;
        const foundGame = games.find(
          (game) => game.gameId === parseInt(item.FungamessBets?.[0]?.gameId),
        )?.name;
        return {
          id: item.id,
          bet,
          date: item.createdAt,
          amount: decimalToNumber(item.betAmount),
          settlement: decimalToNumber(item.settlementAmount),
          previousBalance: decimalToNumber(item.previousBalance),
          status: item.status,
          transactionId: data?.placeBet?.betslip?.provider_betslip_id,
          targetBalance,
          isCashOut,
          game: foundGame ?? '-',
          betId: item.thirdPartyIdentifier,
          sport: bet?.sport_name ?? '-',
          event: bet?.competitor_name?.join(' - ') ?? '-',
          tournament: bet?.tournament_name ?? '-',
          outcome: bet?.outcome_name ?? '-',
        };
      }),
      count,
    };
  }

  async getUserSportsExchangeBets(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: SportsExchangeBetReportItem[]; count: number }> {
    const bets = await this.prismaService.bet.findMany({
      where: {
        userId,
        provider: BetProviders.SPORTS_EXCHANGE,
      },
      include: {
        FungamessBets: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const count = await this.prismaService.bet.count({
      where: {
        userId,
        provider: BetProviders.SPORTS_EXCHANGE,
      },
    });

    const thirdPartyIdentifier = bets.map((bet) => bet.thirdPartyIdentifier);

    // Fetching related transactions
    const transactions = await this.prismaService.transaction.findMany({
      where: {
        referenceId: {
          in: thirdPartyIdentifier,
        },
        operationType: 'DEBIT'
      },
      select: {
        referenceId: true,
        targetBalance: true,
        amount: true,
      },
    });

    const transactionMap = transactions
      .reduce(
        (acc, transaction) => {
          if (!acc[transaction.referenceId]) {
            acc[transaction.referenceId] = [];
          }
          acc[transaction.referenceId].push({
            targetBalance: transaction.targetBalance,
            amount: decimalToNumber(transaction.amount),
          });
          return acc;
        },
        {} as Record<string, { targetBalance: string | null; amount: number }[]>,
      );

    type TempSportsExchange = {
      selection?: string;
      sportName?: string;
      roundName?: string;
      matchName?: string;
      backLay?: number;
      odds?: number;
    };

    return {
      data: bets.map((item) => {
        const data = item.metadata as any; // TODO: this is shit
        const bet = data?.placeBet as TempSportsExchange | undefined;
        const transactionsForBet = transactionMap[item.thirdPartyIdentifier];

        const targetBalance =
          transactionsForBet?.map((tx) => ({
            balance: tx.targetBalance,
            amount: tx.amount,
          })) || [];

        return {
          id: item.id,
          date: item.createdAt,
          amount: decimalToNumber(item.betAmount),
          settlement: decimalToNumber(item.settlementAmount),
          targetBalance,
          previousBalance: decimalToNumber(item.previousBalance),
          status: item.status,
          event: bet?.matchName ?? '-',
          team: bet?.selection ?? '-',
          sport: bet?.sportName ?? '-',
          marketName: bet?.roundName ?? '-',
          betId: item.thirdPartyIdentifier,
          side:
            typeof bet?.backLay !== 'undefined'
              ? bet.backLay === 0
                ? 'Lay'
                : 'Back'
              : '-',
          rate: bet?.odds ?? 0.0,
        };
      }),
      count,
    };
  }

  private getOutcomeFilter(filters: {
    outcomeWin?: boolean;
    outcomeLoss?: boolean;
    outcomePending?: boolean;
    outcomeCashOut?: boolean;
  }): Prisma.BetWhereInput {
    const statusArray: BetStatus[] = [];
    if (filters.outcomeWin) statusArray.push(BetStatuses.WIN);
    if (filters.outcomeLoss) statusArray.push(BetStatuses.LOSS);
    if (filters.outcomePending) statusArray.push(BetStatuses.PENDING);
    if (filters.outcomeCashOut) statusArray.push(BetStatuses.CASH_OUT);

    if (statusArray.length > 1) {
      return {
        status: {
          in: statusArray,
        },
      };
    }

    if (statusArray.length === 1) return { status: statusArray.at(0) };
    return {
      status: {
        notIn: [
          BetStatuses.WIN,
          BetStatuses.LOSS,
          BetStatuses.PENDING,
          BetStatuses.CASH_OUT,
        ],
      },
    };
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity, @typescript-eslint/explicit-function-return-type
  async getAllGameBets(
    filters: {
      userSearch?: string;
      interval?: [Date, Date];
      amount?: [number, number];
      odds?: [number, number];
      outcomeWin?: boolean;
      outcomeLoss?: boolean;
      outcomePending?: boolean;
      outcomeCashOut?: boolean;
      categoryGames?: boolean;
      categorySportsbook?: boolean;
      categorySportsExchange?: boolean;
      userId?: string;
    },
    requesterId: string,
    page = 1,
    limit = 10,
  ): Promise<{ count: number; data: BetReportItem[] }> {
    const permissions = !requesterId
      ? []
      : await this.permissionService.getUserPermissions(requesterId);

    const hasReadOwnBetsReporstsPermission = permissions.some(
      (permission) =>
        permission === Permissions.READ_OWN_BETS_REPORTS ||
        permission === Permissions.READ_OWN_LIVE_BETS,
    );
    const where: Prisma.BetWhereInput = {
      createdAt: filters.interval
        ? {
            gte: filters.interval?.[0],
            lte: filters.interval?.[1],
          }
        : undefined,
      betAmount: filters.amount
        ? {
            gte: filters.amount?.[0],
            lte: filters.amount?.[1],
          }
        : undefined,
      user: filters.userSearch
        ? {
            masterId: hasReadOwnBetsReporstsPermission
              ? requesterId
              : undefined,
            ...(filters.userId
              ? { id: filters.userId }
              : {
                  OR: [
                    {
                      email: {
                        contains: filters.userSearch,
                        mode: 'insensitive',
                      },
                    },
                    {
                      nickname: {
                        contains: filters.userSearch,
                        mode: 'insensitive',
                      },
                    },
                    {
                      wallet: {
                        contains: filters.userSearch,
                        mode: 'insensitive',
                      },
                    },
                    {
                      id: {
                        contains: filters.userSearch,
                        mode: 'insensitive',
                      },
                    },
                    {
                      playerTag: {
                        contains: filters.userSearch,
                        mode: 'insensitive',
                      },
                    },
                  ],
                }),
          }
        : {
            masterId: hasReadOwnBetsReporstsPermission
              ? requesterId
              : undefined,
          },
      ...(filters.odds
        ? {
            metadata: {
              path: ['palceBet', 'odds'],
              gte: filters.odds[0],
              lte: filters.odds[1],
            },
          }
        : {}),
      ...this.getOutcomeFilter(filters),
      OR:
        filters.categoryGames &&
        filters.categorySportsExchange &&
        filters.categorySportsbook
          ? undefined
          : [
              ...(filters.categoryGames
                ? [
                    {
                      OR: [
                        {
                          provider: BetProviders.FUNGAMESS,
                          metadata: {
                            path: ['placeBet', 'extraData', 'betslip'], // TODO: this is shit
                            not: Prisma.AnyNull,
                          },
                        },
                        { provider: BetProviders.SLOTEGRATOR_GAMES },
                      ],
                    },
                  ]
                : []),
              ...(filters.categorySportsExchange
                ? [
                    {
                      provider: BetProviders.SPORTS_EXCHANGE,
                    },
                  ]
                : []),
              ...(filters.categorySportsbook
                ? [
                    {
                      OR: [
                        {
                          provider: BetProviders.FUNGAMESS,
                          metadata: {
                            path: ['placeBet', 'extraData', 'betslip'], // TODO: this is shit
                            not: Prisma.AnyNull,
                          },
                        },
                        { provider: BetProviders.SLOTEGRATOR_SPORTSBOOK },
                      ],
                    },
                  ]
                : []),
            ],
    };

    const [count, bets] = await Promise.all([
      this.prismaService.bet.count({
        where,
      }),
      this.prismaService.bet.findMany({
        where,
        include: betReportSelect.include,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const thirdPartyIdentifier = bets.map((bet) => bet.thirdPartyIdentifier);

    // Fetching related transactions
    const transactions = await this.prismaService.transaction.findMany({
      where: {
        referenceId: {
          in: thirdPartyIdentifier,
        },
        operationType: 'DEBIT'
      },
      select: {
        referenceId: true,
        targetBalance: true,
        amount: true,
      },
    });

    const transactionMap = transactions.reduce(
      (acc, transaction) => {
        if (!acc[transaction.referenceId]) {
          acc[transaction.referenceId] = [];
        }
        acc[transaction.referenceId].push({
          targetBalance: transaction.targetBalance,
          amount: decimalToNumber(transaction.amount),
        });
        return acc;
      },
      {} as Record<string, { targetBalance: string | null; amount: number }[]>,
    );

    const data = bets
      .map((bet) => {
        const data = bet.metadata as Record<string, any>;
        const category =
          (bet.provider === BetProviders.FUNGAMESS &&
            !data.placeBet?.extraData?.betslip) ||
          bet.provider === BetProviders.SLOTEGRATOR_GAMES
            ? 'Games'
            : (bet.provider === BetProviders.FUNGAMESS &&
                  !!data.placeBet?.extraData?.betslip) ||
                bet.provider === BetProviders.SLOTEGRATOR_SPORTSBOOK
                ? 'Sportsbook'
                : bet.provider === BetProviders.SPORTS_EXCHANGE
                  ? 'Sports Exchange'
                  : 'Unknown';

        const transactionsForBet = transactionMap[bet.thirdPartyIdentifier];

        const targetBalance =
          transactionsForBet?.map((tx) => ({
            balance: tx.targetBalance,
            amount: tx.amount,
          })) || [];

        let gameName = '-';

        if (bet.provider === BetProviders.SLOTEGRATOR_GAMES) {
          gameName = bet.SlotegratorGameBets[0]?.game?.name ?? '-';
        } else {
          gameName =
            data?.placeBet?.matchName ??
            data?.placeBet?.extraData?.GameName ??
            data?.placeBet?.extraData?.gameName ??
            '-';
        }

        return {
          id: bet.id,
          bet,
          previousBalance: bet.previousBalance,
          userId: bet.userId,
          userEmail: bet.user.email ?? undefined,
          userNickname: bet.user.nickname ?? undefined,
          userWallet: bet.user.wallet ?? undefined,
          role: bet.user.userRoles.at(0)?.role.name as string,
          amount: decimalToNumber(bet.betAmount),
          targetBalance,
          date: bet.createdAt.toISOString(),
          odds: data.placeBet?.odds ?? 0,
          outcome: bet.status,
          settlement: bet.settlementAmount,
          category,
          game: gameName,
          betId: bet.thirdPartyIdentifier,
          roundId: bet?.SlotegratorGameBets[0]?.roundId ?? undefined,
          gameId: bet?.SlotegratorGameBets[0]?.gameId ?? undefined,
          casinoPlayerId: bet?.userId ?? undefined,
          sessionId: bet?.SlotegratorGameBets[0]?.sessionId ?? undefined,
        };
      })
      .filter((x) => !!x);

    return {
      count,
      data,
    };
  }
}
