/* eslint-disable sonarjs/no-duplicate-string */
import { ONE_HOUR_IN_SECONDS, SPORTS_BOOK_ID } from '@common/constants';
import { DB } from '@infrastructure/database/kysely/generated';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BetProviders } from '@modules/bet/enum/bet-providers.enum';
import { BetStatuses } from '@modules/bet/enum/bet-status.enum';
import { BonusProgressStatuses } from '@modules/bonus/enum/bonus-progress-status.enum';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { PermissionService } from '@modules/permission/service/permission.service';
import { RoleService } from '@modules/role/service/role.service';
import { StatisticsTarget } from '@modules/statistics/enum/statistics-target.enum';
import { GgrCategories, GgrFormat } from '@modules/statistics/types';
import { convertStatisticsTargetToRole } from '@modules/statistics/utils/convert-statistics-target-to-role';
import { formatStatisticsCacheKey } from '@modules/statistics/utils/format-statistics-cache-key';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { AliasedSelectQueryBuilder, ExpressionBuilder, sql } from 'kysely';
import { DateTime } from 'luxon';

@Injectable()
export class GgrStatisticsService {
  private readonly logger = new Logger(GgrStatisticsService.name);
  constructor(
    private readonly prismaService: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly roleService: RoleService,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async getGGRStatistics<TReturn extends GgrCategories>(
    target: StatisticsTarget = 'all',
    category: TReturn,
    requesterId: string,
    startDate?: DateTime,
    endDate?: DateTime,
    useCache: boolean = false,
  ): Promise<GgrFormat<TReturn>> {
    switch (category) {
      case 'sportExchange': {
        return (await this.getSportsExchangeGgr(
          target,
          requesterId,
          startDate,
          endDate,
          useCache,
        )) as GgrFormat<TReturn>;
      }
      case 'fungamess':
        return (await this.getFungamessGgr(
          target,
          requesterId,
          startDate,
          endDate,
          useCache,
        )) as GgrFormat<TReturn>;
      case 'slotegrator':
        return (await this.getSlotegratorGgr(
          target,
          requesterId,
          startDate,
          endDate,
          useCache,
        )) as GgrFormat<TReturn>;
      case 'poker':
        return (await this.getPokerGgr(
          target,
          requesterId,
          startDate,
          endDate,
          useCache,
        )) as GgrFormat<TReturn>;
      case 'ngr':
        return (await this.getNgr(
          target,
          requesterId,
          startDate,
          endDate,
          useCache,
        )) as GgrFormat<TReturn>;
      default:
        this.logger.error('Invalid category: ' + category, 'getGGRStatistics');
        return {
          sportsBook: new Decimal(0),
          games: new Decimal(0),
        } as GgrFormat<TReturn>;
    }
  }

  private getUserFilterQuery(
    target: StatisticsTarget = 'all',
    requesterId: string,
    roleIds: { id: number }[],
    isMasterRole: boolean,
  ): ((eb: ExpressionBuilder<DB, never>) => AliasedSelectQueryBuilder<{
    user_id: string;
  }, 'filtered_users'>) {
    return (eb) => {
      const query = eb
        .selectFrom('user_roles as ur')
        .select('ur.user_id')
        .innerJoin('users as u',
          (join) =>
            join.onRef('u.id', '=', 'ur.user_id')
              .on('ur.role_id', 'in', roleIds.map(r => r.id))
        ).$if(isMasterRole && target === 'vip', (qb) => qb.where('u.master_id', '=', requesterId))
        .select('u.userBookieStake')

      return query.as('filtered_users');
    }
  }

  // #region Sport Exchange
  private async getSportsExchangeGgr(
    target: StatisticsTarget = 'all',
    requesterId: string,
    startDate?: DateTime,
    endDate?: DateTime,
    useCache: boolean = false,
  ): Promise<Decimal> {
    const permission = await this.permissionService.getUserPermissions(requesterId)

    const isMaster = permission.some(p => p === Permissions.READ_VIP_OWN)

    const isMasterRole = isMaster;

    if (useCache) {
      const cacheKey = formatStatisticsCacheKey(target, 'sportExchange', isMasterRole ? requesterId : undefined, startDate, endDate)
      const cachedData = await this.redis.get(cacheKey)

      if (cachedData) return new Decimal(cachedData)
    }

    const roleIds = await this.roleService.getRolesByName(convertStatisticsTargetToRole(target))

    const userFilterQuery = this.getUserFilterQuery(
      target,
      requesterId,
      roleIds,
      isMasterRole,
    )

    const betsSubQuery = this.prismaService.createQueryBuilder()
      .selectFrom('bets as b')
      .select(
        sql<Decimal>`b.settlement_amount * (1 - COALESCE(filtered_users."userBookieStake", 0))`.as('settlement_amount')
      )
      .select('b.id as id')
      .distinctOn(['id'])
      .innerJoin(userFilterQuery, (join) => join.onRef('filtered_users.user_id', '=', 'b.user_id'))
      .where('b.provider', '=', BetProviders.SPORTS_EXCHANGE)
      .where('b.status', 'in', [BetStatuses.WIN, BetStatuses.LOSS, BetStatuses.CASH_OUT])
      // eslint-disable-next-line sonarjs/no-duplicate-string
      .$if(!!startDate, (qb) => qb.where('b.created_at', '>=', startDate!.toJSDate()))
      .$if(!!endDate, (qb) => qb.where('b.created_at', '<=', endDate!.toJSDate()))

    const { sql: query, parameters } = betsSubQuery.compile()
    const [data] = await this.prismaService.$queryRawUnsafe<
      {
        settlement_amount: Decimal;
      }[]
    >(`
    SELECT
      SUM(games.settlement_amount) AS settlement_amount
    FROM 
      (
        ${query}
      ) AS games
  `, ...parameters);

    const settlementAmount = data?.settlement_amount
      ? data.settlement_amount.mul(-1)
      : undefined

    if (useCache && settlementAmount) {
      const cacheKey = formatStatisticsCacheKey(target, 'sportExchange', isMasterRole ? requesterId : undefined, startDate, endDate)
      await this.redis.set(cacheKey, settlementAmount.toString() || '0', 'EX', 3 * ONE_HOUR_IN_SECONDS)
    }

    return settlementAmount || new Decimal(0)
  }
  // #endregion Sport Exchange

  // #region Fungamess

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async getFungamessGgr(
    target: StatisticsTarget = 'all',
    requesterId: string,
    startDate?: DateTime,
    endDate?: DateTime,
    useCache: boolean = false,
  ): Promise<{
    sportsBook: Decimal;
    games: Decimal;
  }> {
    const sportsBookId = await this.redis.get(SPORTS_BOOK_ID);
    if (!sportsBookId) {
      this.logger.error('Sportsbook id not found in redis');
      return {
        sportsBook: new Decimal(0),
        games: new Decimal(0),
      };
    }

    const permission = await this.permissionService.getUserPermissions(requesterId)

    const isMaster = permission.some(p => p === Permissions.READ_VIP_OWN)

    const isMasterRole = isMaster;

    if (useCache) {
      const cacheKey = formatStatisticsCacheKey(target, 'fungamess', isMasterRole ? requesterId : undefined, startDate, endDate)
      const cachedData = await this.redis.get(cacheKey)
      if (cachedData) {
        const data = JSON.parse(cachedData) as {
        sportsBook: Decimal;
        games: Decimal;
      }
        return {
          games: new Decimal(data?.games ?? 0),
          sportsBook: new Decimal(data?.sportsBook ?? 0),
        }
      }
    }

    const roleIds = await this.roleService.getRolesByName(convertStatisticsTargetToRole(target))

    const userFilterQuery = this.getUserFilterQuery(
      target,
      requesterId,
      roleIds,
      isMasterRole,
    )

    const betsSubQuery = this.prismaService.createQueryBuilder()
      .selectFrom('bets as b')
      .select(
        sql<Decimal>`b.settlement_amount * (1 - COALESCE(filtered_users."userBookieStake", 0))`.as('settlement_amount')
      )
      .select(sql<string>`fb.game_id`.as('game_id'))
      .distinctOn(['b.id'])
      .leftJoin('fungamess_bets as fb', (join) => join.onRef('fb.bet_id', '=', 'b.id'))
      .innerJoin(userFilterQuery, (join) => join.onRef('filtered_users.user_id', '=', 'b.user_id'))
      .where('b.provider', '=', BetProviders.FUNGAMESS)
      .where('b.status', 'in', [BetStatuses.WIN, BetStatuses.LOSS, BetStatuses.CASH_OUT])
      .$if(!!startDate, (qb) => qb.where('b.created_at', '>=', startDate!.toJSDate()))
      .$if(!!endDate, (qb) => qb.where('b.created_at', '<=', endDate!.toJSDate()))

    const { sql: query, parameters } = betsSubQuery.compile()

    const [data] = await this.prismaService.$queryRawUnsafe<
      {
        settlement_amount_book: Decimal;
        settlement_amount_games: Decimal;
      }[]
    >(`
    select
      SUM(case when games.game_id = '${sportsBookId}' then games.settlement_amount else 0.0 end) as settlement_amount_book,
      SUM(case when games.game_id = '${sportsBookId}' then 0.0  else games.settlement_amount end) as settlement_amount_games
    from 
      (
        ${query}
      ) as games
    `, ...parameters);

    const gamesAmount = data?.settlement_amount_games
      ? data.settlement_amount_games.mul(-1)
      : undefined

    const sportsBookAmount = data?.settlement_amount_book
      ? data.settlement_amount_book.mul(-1)
      : undefined

    if (useCache && (gamesAmount || sportsBookAmount)) {
      const cacheKey = formatStatisticsCacheKey(target, 'fungamess', isMasterRole ? requesterId : undefined, startDate, endDate)
      await this.redis.set(cacheKey, JSON.stringify({
        games: gamesAmount?.toString() ?? '0',
        sportsBook: sportsBookAmount?.toString() ?? '0',
      }), 'EX', 3 * ONE_HOUR_IN_SECONDS)
    }

    return {
      games: gamesAmount || new Decimal(0),
      sportsBook: sportsBookAmount || new Decimal(0),
    };
  }

  // #endregion Fungamess

  // #region Slotegrator
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async getSlotegratorGgr(
    target: StatisticsTarget = 'all',
    requesterId: string,
    startDate?: DateTime,
    endDate?: DateTime,
    useCache: boolean = false,
  ): Promise<{
    sportsBook: Decimal;
    games: Decimal;
  }> {
    const permission = await this.permissionService.getUserPermissions(requesterId)

    const isMaster = permission.some(p => p === Permissions.READ_VIP_OWN)

    const isMasterRole = isMaster;

    if (useCache) {
      const cacheKey = formatStatisticsCacheKey(target, 'slotegrator', isMasterRole ? requesterId : undefined, startDate, endDate)
      const cachedData = await this.redis.get(cacheKey)
      if (cachedData) {
        const data = JSON.parse(cachedData) as {
          sportsBook: Decimal;
          games: Decimal;
        }
        return {
          games: new Decimal(data?.games ?? 0),
          sportsBook: new Decimal(data?.sportsBook ?? 0),
        }
      }
    }

    const roleIds = await this.roleService.getRolesByName(convertStatisticsTargetToRole(target))

    const userFilterQuery = this.getUserFilterQuery(
      target,
      requesterId,
      roleIds,
      isMasterRole,
    )

    const betsSubQuery = this.prismaService.createQueryBuilder()
      .selectFrom('bets as b')
      .select(
        sql<Decimal>`b.settlement_amount * (1 - COALESCE(filtered_users."userBookieStake", 0))`.as('settlement_amount')
      )
      .select(sql<string>`b.provider`.as('provider'))
      .distinctOn(['b.id'])
      .innerJoin(userFilterQuery, (join) => join.onRef('filtered_users.user_id', '=', 'b.user_id'))
      .where('b.provider', 'in', [BetProviders.SLOTEGRATOR_SPORTSBOOK, BetProviders.SLOTEGRATOR_GAMES])
      .where('b.status', 'in', [BetStatuses.WIN, BetStatuses.LOSS, BetStatuses.CASH_OUT])
      .$if(!!startDate, (qb) => qb.where('b.created_at', '>=', startDate!.toJSDate()))
      .$if(!!endDate, (qb) => qb.where('b.created_at', '<=', endDate!.toJSDate()))

    const { sql: query, parameters } = betsSubQuery.compile()

    const [data] = await this.prismaService.$queryRawUnsafe<
      {
        settlement_amount_book: Decimal;
        settlement_amount_games: Decimal;
      }[]
    >(`
  select
      SUM(games.settlement_amount) as settlement_amount_total,
      SUM(case when games.provider = '${BetProviders.SLOTEGRATOR_SPORTSBOOK}' then games.settlement_amount else 0.0 end) as settlement_amount_book,
      SUM(case when games.provider = '${BetProviders.SLOTEGRATOR_GAMES}' then games.settlement_amount else 0.0 end) as settlement_amount_games
    from
      (
        ${query}
      ) as games;
    `, ...parameters);

    const gamesAmount = data?.settlement_amount_games
      ? data.settlement_amount_games.mul(-1)
      : undefined

    const sportsBookAmount = data?.settlement_amount_book
      ? data.settlement_amount_book.mul(-1)
      : undefined

    if (useCache && (gamesAmount || sportsBookAmount)) {
      const cacheKey = formatStatisticsCacheKey(target, 'slotegrator', isMasterRole ? requesterId : undefined, startDate, endDate)
      await this.redis.set(cacheKey, JSON.stringify({
        games: gamesAmount?.toString() ?? '0',
        sportsBook: sportsBookAmount?.toString() ?? '0',
      }), 'EX', 3 * ONE_HOUR_IN_SECONDS)
    }

    return {
      games: gamesAmount || new Decimal(0),
      sportsBook: sportsBookAmount || new Decimal(0),
    };
  }

  // #endregion Slotegrator
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async getPokerGgr(
    target: StatisticsTarget = 'all',
    requesterId: string,
    startDate?: DateTime,
    endDate?: DateTime,
    useCache: boolean = false,
  ): Promise<Decimal> {
    const permission = await this.permissionService.getUserPermissions(requesterId)

    const isMaster = permission.some(p => p === Permissions.READ_VIP_OWN)

    const isMasterRole = isMaster;

    if (useCache) {
      const cacheKey = formatStatisticsCacheKey(target, 'poker', isMasterRole ? requesterId : undefined, startDate, endDate)
      const cachedData = await this.redis.get(cacheKey)
      if (cachedData) return new Decimal(cachedData)
    }

    const roleIds = await this.roleService.getRolesByName(convertStatisticsTargetToRole(target))

    const userFilterQuery = this.getUserFilterQuery(
      target,
      requesterId,
      roleIds,
      isMasterRole,
    )

    const transactionsSubQuery = this.prismaService.createQueryBuilder()
      .selectFrom('transactions_ledger as t')
      .select(
        sql<Decimal>`t.amount * (1 - COALESCE(filtered_users."userBookieStake", 0))`.as('amount')
      )
      .select(sql<string>`t.operation_type`.as('operation_type'))
      .distinctOn(['t.id'])
      .innerJoin(userFilterQuery, (join) => join.onRef('filtered_users.user_id', '=', 't.user_id'))
      .where('t.counter_party', '=', TransactionCounterParties.EVENBET_POKER)
      .where('t.operation_type', 'in', [TransactionOperationTypes.DEBIT, TransactionOperationTypes.CREDIT])
      .$if(!!startDate, (qb) => qb.where('t.created_at', '>=', startDate!.toJSDate()))
      .$if(!!endDate, (qb) => qb.where('t.created_at', '<=', endDate!.toJSDate()))

    const { sql: query, parameters } = transactionsSubQuery.compile()

    const [data] = await this.prismaService.$queryRawUnsafe<
      {
        debit_amount: Decimal;
        credit_amount: Decimal;
      }[]
    >(`
      select
        SUM(case when transactions.operation_type = '${TransactionOperationTypes.DEBIT}' then transactions.amount else 0.0 end) as debit_amount,
        SUM(case when transactions.operation_type = '${TransactionOperationTypes.CREDIT}' then transactions.amount else 0.0 end) as credit_amount
      from 
        (
          ${query}
        ) as transactions
    `, ...parameters);

    const debitAmount = data?.debit_amount
      ? data.debit_amount
      : undefined

    const creditAmount = data?.credit_amount
      ? data.credit_amount
      : undefined

    if (useCache && debitAmount && creditAmount) {
      const cacheKey = formatStatisticsCacheKey(target, 'poker', isMasterRole ? requesterId : undefined, startDate, endDate)
      await this.redis.set(cacheKey, debitAmount.sub(creditAmount).toString(), 'EX', 3 * ONE_HOUR_IN_SECONDS)
    }

    return new Decimal(debitAmount || 0).sub(
      new Decimal(creditAmount || 0)
    );
  }

  // #region NGR
  private async getNgr(
    target: StatisticsTarget = 'all',
    requesterId: string,
    startDate?: DateTime<true>,
    endDate?: DateTime<true>,
    useCache: boolean = false,
  ): Promise<Decimal> {
    const permission = await this.permissionService.getUserPermissions(requesterId)

    const isMaster = permission.some(p => p === Permissions.READ_VIP_OWN)

    const isMasterRole = isMaster;

    if (useCache) {
      const cacheKey = formatStatisticsCacheKey(target, 'ngr', isMasterRole ? requesterId : undefined, startDate, endDate)
      const cachedData = await this.redis.get(cacheKey)
      if (cachedData) return new Decimal(cachedData)
    }

    const roleIds = await this.roleService.getRolesByName(convertStatisticsTargetToRole(target))

    const userFilterQuery = this.getUserFilterQuery(
      target,
      requesterId,
      roleIds,
      isMasterRole,
    )

    const bonusProgressionsQuery = this.prismaService.createQueryBuilder()
      .selectFrom('user_bonus_progressions as ubp')
      .select(sql<Decimal>`SUM(CASE WHEN ubp.status = ${BonusProgressStatuses.COMPLETED} THEN ubp.reward_amount ELSE 0.0 END)`.as('bonus_given'))
      .where('ubp.status', '=', BonusProgressStatuses.COMPLETED)
      .innerJoin(userFilterQuery, (join) => join.onRef('filtered_users.user_id', '=', 'ubp.user_id'))
      .$if(!!startDate, (qb) => qb.where('ubp.updated_at', '>=', startDate!.toJSDate()))
      .$if(!!endDate, (qb) => qb.where('ubp.updated_at', '<=', endDate!.toJSDate()))
      .where(({ not, selectFrom, eb }) => {
        return not(
          eb('ubp.bonus_id', 'in',
            selectFrom('bonuses')
              .select('id')
              .where('name', '=', 'Rollback'))
        )
      })

    const [data] = await this.prismaService.runQuery<{
      bonus_given: Decimal;
    }>(bonusProgressionsQuery.compile())

    // TODO: Mihai - I added ubp.bonus_id NOT IN, it might be wrong, and dirty.
    // TODO: Laut - Idk, man. I trust you

    if (useCache && data?.bonus_given) {
      const cacheKey = formatStatisticsCacheKey(target, 'ngr', isMasterRole ? requesterId : undefined, startDate, endDate)
      await this.redis.set(cacheKey, data.bonus_given.toString(), 'EX', 3 * ONE_HOUR_IN_SECONDS)
    }

    return data?.bonus_given || new Decimal(0);
  }
  // #endregion NGR
}
