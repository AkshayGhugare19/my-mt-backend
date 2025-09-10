import { Roles } from '@modules/role/enum/role.enum';
import { BalanceService } from '@modules/balance/service/balance.service';
import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { GenericStatisticsType } from '../dtos/generic-statistics.response.dto';
import { genericGgrComputation, GenericGGRComputationParams } from '../utils/generic-ggr-computations';
import { UsersStatistics } from '@modules/statistics/dtos/users-statistics.dto';
import { UsersStatisticsService } from '@modules/statistics/service/users-statistics.service';
import { FundsStatistics } from '@modules/statistics/dtos/funds-statistics.dto';
import { FundsStatisticsService } from '@modules/statistics/service/funds-statistics.service';
import { convertCountAndValueFromDecimal } from '@modules/statistics/utils/convert-count-and-value-from-decimal';
import { StatisticsTarget } from '@modules/statistics/enum/statistics-target.enum';
import { GgrStatisticsService } from '@modules/statistics/service/ggr-statistics.service';
import { GgrStatistics, GgrStatisticsRange } from '@modules/statistics/dtos/ggr-statistics.dto';
import { TokenIssueStatisticsService } from '@modules/statistics/service/token-issue-statistics.service';
import { PermissionService } from '@modules/permission/service/permission.service';
import { Permission, Permissions } from '@modules/permission/enum/permission.enum';
import { runIfPermission } from '@modules/permission/utils/run-if-permission';
import {
  DateRange,
  FundsCountAndValue,
  FundsStatisticsPermissions,
  GgrCategories,
  GgrFormat,
  StatisticsByTime,
  UserStatisticsOptions,
} from '@modules/statistics/types';
import { DateTime } from 'luxon';
import { getDatesForPeriod } from '@modules/statistics/utils/get-dates-for-period';

type SimplifiedBalanceData = {
  role: string;
  volumePlayed: Decimal;
  totalWin: Decimal;
  totalLoss: Decimal;
};

function simplifiedDataToGGRParams(value: SimplifiedBalanceData): GenericGGRComputationParams {
  return {
    totalBets: value.volumePlayed,
    winningsPaidOut: value.totalWin,
  };
}

@Injectable()
export class StatisticsService {
  constructor(
    private readonly balanceService: BalanceService,
    private readonly userStatisticsService: UsersStatisticsService,
    private readonly fundsStatisticsService: FundsStatisticsService,
    private readonly ggrStatisticsService: GgrStatisticsService,
    private readonly tokenIssueStatisticsService: TokenIssueStatisticsService,
    private readonly permissionService: PermissionService,
  ) {}

  async getUsersStatisticsByPermission(
    requesterId: string,
    target: StatisticsTarget = 'all',
    timezone?: string,
  ): Promise<UsersStatistics | undefined> {
    const permissions = await this.permissionService.getUserPermissions(requesterId);
    if (permissions.includes(Permissions.READ_STATISTICS_USER_ACTIVITY)) {
      return this.getUsersStatistics({ target, timezone });
    }
    if (permissions.includes(Permissions.READ_STATISTICS_VIP_OWN_ACTIVITY)) {
      return this.getUsersStatistics({
        masterId: requesterId,
        target,
        timezone,
      });
    }
    return undefined;
  }

  async getUsersStatistics({ masterId, target = 'all', timezone }: UserStatisticsOptions): Promise<UsersStatistics> {
    const [
      totalUsersCount,
      totalActiveUsersToday,
      totalActiveUsersLastDays,
      usersJoinedToday,
      // Yes, I know you should use Promise.all, but using it breaks the prisma transaction pool
      // So we're using await instead
    ] = [
      await this.userStatisticsService.getTotalUsersCount({ masterId, target }),
      await this.userStatisticsService.getTotalActiveUsersToday({
        masterId,
        target,
        timezone,
      }),
      await this.userStatisticsService.getTotalActiveUsersLastDays({
        numberOfDays: 7,
        target,
        timezone,
        masterId,
      }),
      await this.userStatisticsService.getUsersJoinedToday({
        target,
        timezone,
        masterId,
      }),
    ];
    return {
      totalUsers: totalUsersCount,
      totalActiveUsersToday,
      totalActiveUsersLast7Days: totalActiveUsersLastDays,
      usersJoinedToday,
    };
  }

  private async getFundsStatisticsPermissions(permissions: Permission[]): Promise<FundsStatisticsPermissions> {
    return {
      readTotalUsersFundsStatistics: permissions.includes(Permissions.READ_STATISTICS_FUNDS_USER),
      readDepositsStatistics: permissions.includes(Permissions.READ_STATISTICS_FUNDS_DEPOSIT),
      readVolumeStatistics: permissions.includes(Permissions.READ_STATISTICS_FUNDS_VOLUME),
      readWithdrawalStatistics: permissions.includes(Permissions.READ_STATISTICS_FUNDS_WITHDRAWAL),
      readTokenIssueStatistics: permissions.includes(Permissions.READ_STATISTICS_FUNDS_TOKEN_ISSUE),
      readVipFundsStatistics:
        permissions.includes(Permissions.READ_STATISTICS_VIP) &&
        permissions.includes(Permissions.READ_STATISTICS_FUNDS_USER),
      readOwnVipFundsStatistics: permissions.includes(Permissions.READ_STATISTICS_FUNDS_VIP_OWN),
      readOwnVipTokenIssueStatistics: permissions.includes(Permissions.READ_STATISTICS_FUNDS_OWN_VIP_TOKEN_ISSUE),
      readOwnVipVolumeStatistics: permissions.includes(Permissions.READ_STATISTICS_FUNDS_VIP_OWN_VOLUME),
      readOwnMasterGrossPNL: permissions.includes(Permissions.READ_STATISTICS_FUNDS_OWN_TOKEN_SETTLEMENT),
      readOwnMasterDebt: permissions.includes(Permissions.READ_STATISTICS_FUNDS_OWN_TOKEN_SETTLEMENT),
      readOwnMasterNetPNL: permissions.includes(Permissions.READ_STATISTICS_FUNDS_OWN_TOKEN_SETTLEMENT),
      readMasterDebt: permissions.includes(Permissions.READ_STATISTICS_FUNDS_TOKEN_SETTLEMENT),
    };
  }

  async getFundsStatisticsAll(requesterId: string, timezone?: string): Promise<FundsStatistics | undefined> {
    const permissions = await this.permissionService.getUserPermissions(requesterId);

    const {
      readDepositsStatistics,
      readTokenIssueStatistics,
      readTotalUsersFundsStatistics,
      readVolumeStatistics,
      readWithdrawalStatistics,
      readMasterDebt,
    } = await this.getFundsStatisticsPermissions(permissions);

    const [
      totalUsersFunds,
      depositStatistics,
      withdrawalStatistics,
      volumeStatistics,
      tokenIssueStatistics,
      tokensIssuedToMasters,
      allTimeIssuedToMasters,
      tokensInCirculation,
      globalMasterDebt,
    ] = [
      await runIfPermission(readTotalUsersFundsStatistics, () =>
        this.fundsStatisticsService.getTotalFunds({ target: 'all' }),
      ),
      await runIfPermission(readDepositsStatistics, () =>
        this.getDepositStatistics(),
      ),
      await runIfPermission(readWithdrawalStatistics, () =>
        this.getWithdrawalStatistics(),
      ),
      await runIfPermission(readVolumeStatistics, () =>
        this.getVolumeStatistics({ target: 'all' }),
      ),
      await runIfPermission(readTokenIssueStatistics, () =>
        this.getTokenIssueStatistics({}),
      ),
      await runIfPermission(readTokenIssueStatistics, () =>
        this.tokenIssueStatisticsService.getTotalMasterTokens(timezone),
      ),
      await runIfPermission(readTokenIssueStatistics, () => this.tokenIssueStatisticsService.getAllTimeMasterTokens()),
      await runIfPermission(readTokenIssueStatistics, () => this.tokenIssueStatisticsService.getTotalVipBalances()),
      await runIfPermission(readMasterDebt, () => this.tokenIssueStatisticsService.getTotalMasterDebt()),
    ];

    return {
      totalUsersFunds: totalUsersFunds?.toFixed(3),
      depositsToday: depositStatistics && convertCountAndValueFromDecimal(depositStatistics.today),
      depositsThisWeek: depositStatistics && convertCountAndValueFromDecimal(depositStatistics.week),
      depositsThisMonth: depositStatistics && convertCountAndValueFromDecimal(depositStatistics.month),
      allTimeDeposits: depositStatistics && convertCountAndValueFromDecimal(depositStatistics.allTime),
      withdrawalsToday: withdrawalStatistics && convertCountAndValueFromDecimal(withdrawalStatistics.today),
      withdrawalsThisWeek: withdrawalStatistics && convertCountAndValueFromDecimal(withdrawalStatistics.week),
      withdrawalsThisMonth: withdrawalStatistics && convertCountAndValueFromDecimal(withdrawalStatistics.month),
      allTimeWithdrawals: withdrawalStatistics && convertCountAndValueFromDecimal(withdrawalStatistics.allTime),
      netFlowToday:
        depositStatistics &&
        withdrawalStatistics &&
        depositStatistics.today.value.minus(withdrawalStatistics.today.value).toFixed(3),
      netFlowThisWeek:
        depositStatistics &&
        withdrawalStatistics &&
        depositStatistics.week.value.minus(withdrawalStatistics.week.value).toFixed(3),
      netFlowThisMonth:
        depositStatistics &&
        withdrawalStatistics &&
        depositStatistics.month.value.minus(withdrawalStatistics.month.value).toFixed(3),
      allTimeNetFlow:
        depositStatistics &&
        withdrawalStatistics &&
        depositStatistics.allTime.value.minus(withdrawalStatistics.allTime.value).toFixed(3),
      tokensInCirculation: tokensInCirculation?.toFixed(3),
      tokensIssuedToMastersThisWeek: tokensIssuedToMasters?.toFixed(3),
      tokensIssuedToday: tokenIssueStatistics?.today.toFixed(3),
      tokensIssuedThisWeek: tokenIssueStatistics?.week.toFixed(3),
      tokensIssuedThisMonth: tokenIssueStatistics?.month.toFixed(3),
      allTimeTokensIssued: tokenIssueStatistics?.allTime.toFixed(3),
      allTimeTokensIssuedToMasters: allTimeIssuedToMasters?.toFixed(3),
      volumePlayedToday: volumeStatistics?.today.toFixed(3),
      volumePlayedThisWeek: volumeStatistics?.week.toFixed(3),
      volumePlayedThisMonth: volumeStatistics?.month.toFixed(3),
      allTimeVolumePlayed: volumeStatistics?.allTime.toFixed(3),
      masterDebt: globalMasterDebt?.toFixed(3),
    };
  }

  async getFundsStatisticsUsers(requesterId: string, timezone?: string): Promise<FundsStatistics> {
    const permissions = await this.permissionService.getUserPermissions(requesterId);
    const {
      readDepositsStatistics,
      readTotalUsersFundsStatistics,
      readVolumeStatistics,
      readWithdrawalStatistics,
      readMasterDebt,
    } = await this.getFundsStatisticsPermissions(permissions);

    const [totalUsersFunds, depositsStatistics, withdrawalStatistics, volumeStatistics, globalMasterDebt] = [
      await runIfPermission(readTotalUsersFundsStatistics, () =>
        this.fundsStatisticsService.getTotalFunds({ target: 'user' }),
      ),
      await runIfPermission(readDepositsStatistics, () =>
        this.getDepositStatistics(),
      ),
      await runIfPermission(readWithdrawalStatistics, () =>
        this.getWithdrawalStatistics(),
      ),
      await runIfPermission(readVolumeStatistics, () =>
        this.getVolumeStatistics({ target: 'user' }),
      ),
      await runIfPermission(readMasterDebt, () =>
        this.tokenIssueStatisticsService.getTotalMasterDebt(),
      ),
    ];

    return {
      totalUsersFunds: totalUsersFunds?.toFixed(3),
      depositsToday: depositsStatistics && convertCountAndValueFromDecimal(depositsStatistics.today),
      depositsThisWeek: depositsStatistics && convertCountAndValueFromDecimal(depositsStatistics.week),
      depositsThisMonth: depositsStatistics && convertCountAndValueFromDecimal(depositsStatistics.month),
      allTimeDeposits: depositsStatistics && convertCountAndValueFromDecimal(depositsStatistics.allTime),
      withdrawalsToday: withdrawalStatistics && convertCountAndValueFromDecimal(withdrawalStatistics.today),
      withdrawalsThisWeek: withdrawalStatistics && convertCountAndValueFromDecimal(withdrawalStatistics.week),
      withdrawalsThisMonth: withdrawalStatistics && convertCountAndValueFromDecimal(withdrawalStatistics.month),
      netFlowToday:
        depositsStatistics &&
        withdrawalStatistics &&
        depositsStatistics.today.value.minus(withdrawalStatistics.today.value).toFixed(3),
      netFlowThisWeek:
        depositsStatistics &&
        withdrawalStatistics &&
        depositsStatistics.week.value.minus(withdrawalStatistics.week.value).toFixed(3),
      netFlowThisMonth:
        depositsStatistics &&
        withdrawalStatistics &&
        depositsStatistics.month.value.minus(withdrawalStatistics.month.value).toFixed(3),
      allTimeNetFlow:
        depositsStatistics &&
        withdrawalStatistics &&
        depositsStatistics.allTime.value.minus(withdrawalStatistics.allTime.value).toFixed(3),
      volumePlayedToday: volumeStatistics?.today.toFixed(3),
      volumePlayedThisWeek: volumeStatistics?.week.toFixed(3),
      volumePlayedThisMonth: volumeStatistics?.month.toFixed(3),
      allTimeVolumePlayed: volumeStatistics?.allTime.toFixed(3),
      masterDebt: globalMasterDebt?.toFixed(3),
    };
  }

  async getFundsStatisticsVip(requesterId: string, timezone?: string): Promise<FundsStatistics> {
    const permissions = await this.permissionService.getUserPermissions(requesterId);
    const {
      readTokenIssueStatistics,
      readTotalUsersFundsStatistics,
      readVolumeStatistics,
      readOwnVipFundsStatistics,
      readOwnVipTokenIssueStatistics,
      readOwnVipVolumeStatistics,
      readMasterDebt,
      readOwnMasterDebt,
      readOwnMasterGrossPNL,
      readOwnMasterNetPNL,
    } = await this.getFundsStatisticsPermissions(permissions);

    const [
      totalUsersFunds,
      totalOwnVipStatistics,
      volumeStatistics,
      ownVipVolumeStatistics,
      tokenIssueStatistics,
      tokenIssuesOwnVip,
      tokensIssuedToMasters,
      allTimeIssuedToMasters,
      tokensInCirculation,
      globalMasterDebt,
      ownMasterDebt,
      ownMasterGrossPnl,
      ownMasterNetPNL,
    ] = [
      await runIfPermission(readTotalUsersFundsStatistics, () =>
        this.fundsStatisticsService.getTotalFunds({ target: 'vip' }),
      ),
      await runIfPermission(readOwnVipFundsStatistics, () =>
        this.fundsStatisticsService.getTotalFunds({
          target: 'vip',
          masterId: requesterId,
        }),
      ),
      await runIfPermission(readVolumeStatistics, () =>
        this.getVolumeStatistics({ target: 'vip' }),
      ),
      await runIfPermission(readOwnVipVolumeStatistics, () =>
        this.getVolumeStatistics({
          target: 'vip',
          masterId: requesterId,
        }),
      ),
      await runIfPermission(readTokenIssueStatistics, () =>
        this.getTokenIssueStatistics({}),
      ),
      await runIfPermission(readOwnVipTokenIssueStatistics, () =>
        this.getTokenIssueStatistics({ masterId: requesterId }),
      ),
      await runIfPermission(readTokenIssueStatistics, () =>
        this.tokenIssueStatisticsService.getTotalMasterTokens(timezone),
      ),
      await runIfPermission(readTokenIssueStatistics, () => this.tokenIssueStatisticsService.getAllTimeMasterTokens()),
      await runIfPermission(readTokenIssueStatistics, () => this.tokenIssueStatisticsService.getTotalVipBalances()),
      await runIfPermission(readMasterDebt, () => this.tokenIssueStatisticsService.getTotalMasterDebt()),
      await runIfPermission(readOwnMasterDebt, () => this.balanceService.getDebt(requesterId)),
      await runIfPermission(readOwnMasterGrossPNL, () =>
        this.tokenIssueStatisticsService.readOwnMasterGrossPnl(requesterId),
      ),
      await runIfPermission(readOwnMasterNetPNL, () =>
        this.tokenIssueStatisticsService.readOwnMasterNetPnl(requesterId),
      ),
    ];

    return {
      totalUsersFunds: (totalOwnVipStatistics || totalUsersFunds)?.toFixed(3),
      tokensIssuedToday: (tokenIssuesOwnVip || tokenIssueStatistics)?.today.toFixed(3),
      tokensIssuedThisWeek: (tokenIssuesOwnVip || tokenIssueStatistics)?.week.toFixed(3),
      tokensIssuedThisMonth: (tokenIssuesOwnVip || tokenIssueStatistics)?.month.toFixed(3),
      allTimeTokensIssued: (tokenIssuesOwnVip || tokenIssueStatistics)?.allTime.toFixed(3),
      volumePlayedToday: (ownVipVolumeStatistics || volumeStatistics)?.today.toFixed(3),
      volumePlayedThisWeek: (ownVipVolumeStatistics || volumeStatistics)?.week.toFixed(3),
      volumePlayedThisMonth: (ownVipVolumeStatistics || volumeStatistics)?.month.toFixed(3),
      allTimeVolumePlayed: (ownVipVolumeStatistics || volumeStatistics)?.allTime.toFixed(3),
      tokensInCirculation: tokensInCirculation?.toFixed(3),
      tokensIssuedToMastersThisWeek: tokensIssuedToMasters?.toFixed(3),
      allTimeTokensIssuedToMasters: allTimeIssuedToMasters?.toFixed(3),
      ownDebt: ownMasterDebt?.toFixed(3),
      masterDebt: globalMasterDebt?.toFixed(3),
      masterGrossPnl: ownMasterGrossPnl?.toFixed(3),
      masterNetPnl: ownMasterNetPNL ? ownMasterNetPNL.minus(ownMasterDebt || new Decimal(0)).toFixed(3) : undefined,
    };
  }

  async getTokenIssueStatistics({
    masterId,
  }: {
    masterId?: string;
  }): Promise<StatisticsByTime<Decimal>> {
    const tokenIssueStatisticsToday = await this.fundsStatisticsService.getTokenIssueStatistics(
      masterId,
      ...getDatesForPeriod('today'),
    );

    const startOfDay = DateTime.now().setZone('UTC').startOf('day')

    const [startWeekDate] = getDatesForPeriod('week')
    const [startMonthDate] = getDatesForPeriod('month')

    const [
      tokenIssueStatisticsWeek,
      tokenIssueStatisticsMonth,
      tokenIssueStatistics,
    ] = [

      await this.fundsStatisticsService.getTokenIssueStatistics(
        masterId,
        startWeekDate,
        startOfDay,
        true,
      ),
      await this.fundsStatisticsService.getTokenIssueStatistics(
        masterId,
        startMonthDate,
        startOfDay,
        true,
      ),
      await this.fundsStatisticsService.getTokenIssueStatistics(
        masterId,
        undefined,
        startOfDay,
        true,
      ),
    ];
    return {
      today: tokenIssueStatisticsToday,
      week: tokenIssueStatisticsWeek.plus(tokenIssueStatisticsToday),
      month: tokenIssueStatisticsMonth.plus(tokenIssueStatisticsToday),
      allTime: tokenIssueStatistics.plus(tokenIssueStatisticsToday),
    };
  }

  async getVolumeStatistics({
    masterId,
    target = 'all',
  }: {
    masterId?: string;
    target: StatisticsTarget;
  }): Promise<StatisticsByTime<Decimal>> {
    const volumeStatisticsToday = await this.fundsStatisticsService.getVolumeStatistics(
      target,
      masterId,
      ...getDatesForPeriod('today')
    )

    const startOfDay = DateTime.now().setZone('UTC').startOf('day')

    const [startWeekDate] = getDatesForPeriod('week')
    const [startMonthDate] = getDatesForPeriod('month')

    const [
      volumeStatisticsWeek,
      volumeStatisticsMonth,
      volumeStatistics,
    ] = [

      await this.fundsStatisticsService.getVolumeStatistics(
        target,
        masterId,
        startWeekDate,
        startOfDay,
        true,
      ),
      await this.fundsStatisticsService.getVolumeStatistics(
        target,
        masterId,
        startMonthDate,
        startOfDay,
        true,
      ),
      await this.fundsStatisticsService.getVolumeStatistics(
        target,
        masterId,
        undefined,
        startOfDay,
        true,
      ),
    ];
    return {
      today: volumeStatisticsToday,
      week: volumeStatisticsWeek.plus(volumeStatisticsToday),
      month: volumeStatisticsMonth.plus(volumeStatisticsToday),
      allTime: volumeStatistics.plus(volumeStatisticsToday),
    };
  }

  async getDepositStatistics(): Promise<StatisticsByTime<FundsCountAndValue>> {
    const depositStatisticsToday = await this.fundsStatisticsService.getDepositsStatistics(...getDatesForPeriod('today'));

    // This is to exclude today and fetch only historical data that can be cached
    const startOfDay = DateTime.now().setZone('UTC').startOf('day')

    const [startWeekDate] = getDatesForPeriod('week')
    const [startMonthDate] = getDatesForPeriod('month')

    const [
      depositStatisticsWeek,
      depositStatisticsMonth,
      depositsStatistics,
    ] = [
      await this.fundsStatisticsService.getDepositsStatistics(
        startWeekDate,
        startOfDay,
        true,
      ),
      await this.fundsStatisticsService.getDepositsStatistics(
        startMonthDate,
        startOfDay,
        true,
      ),
      await this.fundsStatisticsService.getDepositsStatistics(
        undefined,
        startOfDay,
        true,
      ),
    ];
    return {
      today: depositStatisticsToday,
      week: {
        count: depositStatisticsWeek.count + depositStatisticsToday.count,
        value: depositStatisticsWeek.value.plus(depositStatisticsToday.value),
      },
      month: {
        count: depositStatisticsMonth.count + depositStatisticsToday.count,
        value: depositStatisticsMonth.value.plus(depositStatisticsToday.value),
      },
      allTime: {
        count: depositsStatistics.count + depositStatisticsToday.count,
        value: depositsStatistics.value.plus(depositStatisticsToday.value),
      },
    };
  }

  async getWithdrawalStatistics(): Promise<StatisticsByTime<FundsCountAndValue>> {
    const withdrawalStatisticsToday = await this.fundsStatisticsService.getWithdrawalStatistics(...getDatesForPeriod('today'));

    // This is to exclude today and fetch only historical data that can be cached
    const startOfDay = DateTime.now().setZone('UTC').startOf('day')

    const [startWeekDate] = getDatesForPeriod('week')
    const [startMonthDate] = getDatesForPeriod('month')

    const [
      withdrawalStatisticsWeek,
      withdrawalStatisticsMonth,
      withdrawalStatistics,
    ] = [
      await this.fundsStatisticsService.getWithdrawalStatistics(
        startWeekDate,
        startOfDay,
        true,
      ),
      await this.fundsStatisticsService.getWithdrawalStatistics(
        startMonthDate,
        startOfDay,
        true,
      ),
      await this.fundsStatisticsService.getWithdrawalStatistics(
        undefined,
        startOfDay,
        true,
      ),
    ];

    return {
      allTime: {
        count: withdrawalStatistics.count + withdrawalStatisticsToday.count,
        value: withdrawalStatistics.value.plus(withdrawalStatisticsToday.value),
      },
      month: {
        count: withdrawalStatisticsMonth.count + withdrawalStatisticsToday.count,
        value: withdrawalStatisticsMonth.value.plus(withdrawalStatisticsToday.value),
      },
      week: {
        count: withdrawalStatisticsWeek.count + withdrawalStatisticsToday.count,
        value: withdrawalStatisticsWeek.value.plus(withdrawalStatisticsToday.value),
      },
      today: withdrawalStatisticsToday,
    };
  }

  async getFundsStatistics(
    requesterId: string,
    target: StatisticsTarget = 'all',
  ): Promise<FundsStatistics | undefined> {
    switch (target) {
      case 'all':
        return this.getFundsStatisticsAll(requesterId);
      case 'user':
        return this.getFundsStatisticsUsers(requesterId);
      case 'vip':
        return this.getFundsStatisticsVip(requesterId);
    }
  }

  async getGgrStatisticsRange(
    requesterId: string,
    target: StatisticsTarget = 'all',
    date: DateRange,
  ): Promise<GgrStatisticsRange | undefined> {
    const { hasNgrPermission, hasFungamessPermission, hasSportExchangePermission, hasPokerPermission } =
      await this.getBetsGgrPermissions(requesterId);

    // Yes, I know you should use Promise.all, but using it breaks the prisma transaction pool
    // So we're using await instead
    const [sportExchange, fungamess, slotegrator, poker, ngr] = [
      await runIfPermission(hasSportExchangePermission, () =>
        this.getGgrRange(target, 'sportExchange', requesterId, date),
      ),
      await runIfPermission(hasFungamessPermission, () => this.getGgrRange(target, 'fungamess', requesterId, date)),
      await runIfPermission(hasFungamessPermission, () => this.getGgrRange(target, 'slotegrator', requesterId, date)),
      await runIfPermission(hasPokerPermission, () => this.getGgrRange(target, 'poker', requesterId, date)),
      await runIfPermission(hasNgrPermission, () => this.getGgrRange(target, 'ngr', requesterId, date)),
    ];

    return {
      overall: (fungamess?.games || new Decimal(0))
        .add(fungamess?.sportsBook || new Decimal(0))
        .add(slotegrator?.games || new Decimal(0))
        .add(slotegrator?.sportsBook || new Decimal(0))
        .add(sportExchange || new Decimal(0))
        .add(poker || new Decimal(0))
        .toFixed(3),
      games: (fungamess?.games || new Decimal(0)).add(slotegrator?.games || new Decimal(0)).toFixed(3),
      sportsBook: (fungamess?.sportsBook || new Decimal(0)).add(slotegrator?.sportsBook || new Decimal(0)).toFixed(3),
      sportExchange: sportExchange?.toFixed(3),
      poker: poker?.toFixed(3),
      ngr: ngr?.toFixed(3),
    };
  }

  async getGgrStatistics(
    requesterId: string,
    target: StatisticsTarget = 'all',
  ): Promise<GgrStatistics | undefined> {
    const { hasNgrPermission, hasFungamessPermission, hasSportExchangePermission, hasPokerPermission } =
      await this.getBetsGgrPermissions(requesterId);

    // Yes, I know you should use Promise.all, but using it breaks the prisma transaction pool
    // So we're using await instead
    const [sportExchange, fungamess, poker] = [
      await runIfPermission(hasSportExchangePermission, () =>
        this.getSportExchangeGgr(target, requesterId),
      ),
      await runIfPermission(hasFungamessPermission, () =>
        this.getFungamessGgr(target, requesterId),
      ),
      await runIfPermission(hasPokerPermission, () =>
        this.getPokerGgr(target, requesterId),
      ),
    ];

    const overall = this.computeOverallGgrStatistics(fungamess, sportExchange, poker);

    const [ngr] = await Promise.all([
      runIfPermission(hasNgrPermission, () =>
        this.getNgr(target, requesterId, overall),
      ),
    ]);

    return sportExchange || fungamess || poker || ngr
      ? {
          overall: overall || undefined,
          ngr: ngr || undefined,
          sportExchange: sportExchange || undefined,
          games: fungamess?.games || undefined,
          sportBook: fungamess?.sportsBook || undefined,
          poker: poker || undefined,
        }
      : undefined;
  }

  private async getBetsGgrPermissions(userId: string): Promise<{
    hasNgrPermission: boolean;
    hasFungamessPermission: boolean;
    hasSportExchangePermission: boolean;
    hasPokerPermission: boolean;
  }> {
    const permissions = await this.permissionService.getUserPermissions(userId);
    const hasNgrPermission = permissions.includes(Permissions.READ_NGR);
    const hasFungamessPermission = permissions.includes(Permissions.READ_FUNGAMESS_GGR);
    const hasSportExchangePermission = permissions.includes(Permissions.READ_SPORTS_EXCHANGE_GGR);
    const hasPokerPermission = permissions.includes(Permissions.READ_POKER_GGR);
    return {
      hasNgrPermission,
      hasFungamessPermission,
      hasSportExchangePermission,
      hasPokerPermission,
    };
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private computeOverallGgrStatistics(
    fungamess:
      | {
          sportsBook: GgrStatistics['sportBook'];
          games: GgrStatistics['games'];
        }
      | undefined,
    sportExchange: GgrStatistics['sportExchange'] | undefined,
    poker: GgrStatistics['poker'] | undefined,
  ):
    | {
        ggrToday: string;
        ggrThisWeek: string;
        ggrThisMonth: string;
        ggrAllTime: string;
      }
    | undefined {
    return fungamess || sportExchange || poker
      ? {
          ggrAllTime: new Decimal(0)
            .plus(fungamess?.games?.ggrGamesAllTime || 0)
            .plus(fungamess?.sportsBook?.ggrSportBookAllTime || 0)
            .plus(sportExchange?.ggrSportExchangeAllTime || 0)
            .plus(poker?.ggrPokerAllTime || 0)
            .toFixed(3),
          ggrThisMonth: new Decimal(0)
            .plus(fungamess?.games?.ggrGamesThisMonth || 0)
            .plus(fungamess?.sportsBook?.ggrSportBookThisMonth || 0)
            .plus(sportExchange?.ggrSportExchangeThisMonth || 0)
            .plus(poker?.ggrPokerThisMonth || 0)
            .toFixed(3),
          ggrThisWeek: new Decimal(0)
            .plus(fungamess?.games?.ggrGamesThisWeek || 0)
            .plus(fungamess?.sportsBook?.ggrSportBookThisWeek || 0)
            .plus(sportExchange?.ggrSportExchangeThisWeek || 0)
            .plus(poker?.ggrPokerThisWeek || 0)
            .toFixed(3),
          ggrToday: new Decimal(0)
            .plus(fungamess?.games?.ggrGamesToday || 0)
            .plus(fungamess?.sportsBook?.ggrSportBookToday || 0)
            .plus(sportExchange?.ggrSportExchangeToday || 0)
            .plus(poker?.ggrPokerToday || 0)
            .toFixed(3),
        }
      : undefined;
  }

  private async getGgrRange<TReturn extends GgrCategories>(
    target: StatisticsTarget,
    category: TReturn,
    requesterId: string,
    date: DateRange,
  ): Promise<GgrFormat<TReturn>> {
    const startDate = DateTime.fromJSDate(date.startDate);
    const endDate = DateTime.fromJSDate(date.endDate);
    return this.ggrStatisticsService.getGGRStatistics(target, category, requesterId, startDate, endDate);
  }

  // #region Sport Exchange
  private async getSportExchangeGgr(
    target: StatisticsTarget,
    requesterId: string,
  ): Promise<GgrStatistics['sportExchange']> {
    const todaySportExchangeGgr = await this.ggrStatisticsService.getGGRStatistics(
      target,
      'sportExchange',
      requesterId,
      ...getDatesForPeriod('today'),
    )
    // This is to exclude today and fetch only historical data that can be cached
    const startOfDay = DateTime.now().setZone('UTC').startOf('day')

    const [startWeekDate] = getDatesForPeriod('week')
    const [startMonthDate] = getDatesForPeriod('month')

    const [
      weekSportExchangeGgr,
      monthSportExchangeGgr,
      sportExchangeGgr,
    // Yes, I know you should use Promise.all, but using it breaks the prisma transaction pool
    // So we're using await instead
    ] = [
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'sportExchange',
        requesterId,
        startWeekDate,
        startOfDay,
        true,
      ),
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'sportExchange',
        requesterId,
        startMonthDate,
        startOfDay,
        true,
      ),
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'sportExchange',
        requesterId,
        undefined,
        startOfDay,
        true,
      ),
    ];

    return {
      ggrSportExchangeAllTime: sportExchangeGgr.plus(todaySportExchangeGgr).toFixed(3),
      ggrSportExchangeThisMonth: monthSportExchangeGgr.plus(todaySportExchangeGgr).toFixed(3),
      ggrSportExchangeThisWeek: weekSportExchangeGgr.plus(todaySportExchangeGgr).toFixed(3),
      ggrSportExchangeToday: todaySportExchangeGgr.toFixed(3),
    };
  }

  /// #endregion Sport Exchange

  // #region Fungamess

  private async getFungamessGgr(
    target: StatisticsTarget,
    requesterId: string,
  ): Promise<{
    sportsBook: GgrStatistics['sportBook'];
    games: GgrStatistics['games'];
  }> {
    const todayFungamessGgr = await this.ggrStatisticsService.getGGRStatistics(
      target,
      'fungamess',
      requesterId,
      ...getDatesForPeriod('today'),
    )

    const todaySlotegratorGgr = await this.ggrStatisticsService.getGGRStatistics(
      target,
      'slotegrator',
      requesterId,
      ...getDatesForPeriod('today'),
    )

    const startOfDay = DateTime.now().setZone('UTC').startOf('day')

    const [startWeekDate] = getDatesForPeriod('week')
    const [startMonthDate] = getDatesForPeriod('month')

    const [
      weekGgr,
      monthGgr,
      Ggr,
      slotegratorWeekGgr,
      slotegratorMonthGgr,
      slotegratorGgr,
    ] = [
      // Yes, I know you should use Promise.all, but using it breaks the prisma transaction pool
      // So we're using await instead
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'fungamess',
        requesterId,
        startWeekDate,
        startOfDay,
        true,
      ),
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'fungamess',
        requesterId,
        startMonthDate,
        startOfDay,
        true,
      ),
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'fungamess',
        requesterId,
        undefined,
        startOfDay,
        true,
      ),
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'slotegrator',
        requesterId,
        startWeekDate,
        startOfDay,
        true,
      ),
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'slotegrator',
        requesterId,
        startMonthDate,
        startOfDay,
        true,
      ),
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'slotegrator',
        requesterId,
        undefined,
        startOfDay,
        true,
      ),
    ];

    return {
      games: {
        ggrGamesAllTime: Ggr.games.add(slotegratorGgr.games).add(todayFungamessGgr.games).add(todaySlotegratorGgr.games).toFixed(3),
        ggrGamesThisMonth: monthGgr.games
          .add(slotegratorMonthGgr.games)
          .add(todayFungamessGgr.games)
          .add(todaySlotegratorGgr.games)
          .toFixed(3),
        ggrGamesThisWeek: weekGgr.games
          .add(slotegratorWeekGgr.games)
          .add(todayFungamessGgr.games)
          .add(todayFungamessGgr.games)
          .add(todaySlotegratorGgr.games)
          .toFixed(3),
        ggrGamesToday: todayFungamessGgr.games.add(todaySlotegratorGgr.games).toFixed(3),
      },
      sportsBook: {
        ggrSportBookAllTime: Ggr.sportsBook
          .add(slotegratorGgr.sportsBook)
          .add(todayFungamessGgr.sportsBook)
          .add(todaySlotegratorGgr.sportsBook)
          .toFixed(3),
        ggrSportBookThisMonth: monthGgr.sportsBook
          .add(slotegratorMonthGgr.sportsBook)
          .add(todayFungamessGgr.sportsBook)
          .add(todaySlotegratorGgr.sportsBook)
          .toFixed(3),
        ggrSportBookThisWeek: weekGgr.sportsBook
          .add(slotegratorWeekGgr.sportsBook)
          .add(todayFungamessGgr.sportsBook)
          .add(todaySlotegratorGgr.sportsBook)
          .toFixed(3),
        ggrSportBookToday: todayFungamessGgr.sportsBook
          .add(todaySlotegratorGgr.sportsBook)
          .toFixed(3),
      },
    };
  }

  /// #endregion Fungamess

  // #region Slotegrator

  private async getPokerGgr(
    target: StatisticsTarget,
    requesterId: string,
  ): Promise<GgrStatistics['poker']> {
    const todayPokerGgr = await this.ggrStatisticsService.getGGRStatistics(
      target,
      'poker',
      requesterId,
      ...getDatesForPeriod('today'),
    )

    const startOfDay = DateTime.now().setZone('UTC').startOf('day')

    const [startWeekDate] = getDatesForPeriod('week')
    const [startMonthDate] = getDatesForPeriod('month')

    const [weekPokerGgr, monthPokerGgr, pokerGgr] = [
      // Yes, I know you should use Promise.all, but using it breaks the prisma transaction pool
      // So we're using await instead
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'poker',
        requesterId,
        startWeekDate,
        startOfDay,
        true,
      ),
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'poker',
        requesterId,
        startMonthDate,
        startOfDay,
        true,
      ),
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'poker',
        requesterId,
        undefined,
        startOfDay,
        true,
      ),
    ];

    return {
      ggrPokerAllTime: pokerGgr.add(todayPokerGgr).toFixed(3),
      ggrPokerThisMonth: monthPokerGgr.add(todayPokerGgr).toFixed(3),
      ggrPokerThisWeek: weekPokerGgr.add(todayPokerGgr).toFixed(3),
      ggrPokerToday: todayPokerGgr.toFixed(3),
    };
  }

  /// #endregion Poker

  // #region NGR

  private async getNgr(
    target: StatisticsTarget,
    requesterId: string,
    overall?:
      | {
          ggrToday: string;
          ggrThisWeek: string;
          ggrThisMonth: string;
          ggrAllTime: string;
        }
      | undefined,
  ): Promise<GgrStatistics['ngr']> {
    const todayNgr = await this.ggrStatisticsService.getGGRStatistics(
      target,
      'ngr',
      requesterId,
      ...getDatesForPeriod('today'),
    )

    const startOfDay = DateTime.now().setZone('UTC').startOf('day')

    const [startWeekDate] = getDatesForPeriod('week')
    const [startMonthDate] = getDatesForPeriod('month')

    const [weekNgr, monthNgr, Ngr] = [
      // Yes, I know you should use Promise.all, but using it breaks the prisma transaction pool
      // So we're using await instead
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'ngr',
        requesterId,
        startWeekDate,
        startOfDay,
        true,
      ),
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'ngr',
        requesterId,
        startMonthDate,
        startOfDay,
        true,
      ),
      await this.ggrStatisticsService.getGGRStatistics(
        target,
        'ngr',
        requesterId,
        undefined,
        startOfDay,
        true,
      ),
    ];

    return {
      ngrAllTime: new Decimal(overall?.ggrAllTime || 0).sub(Ngr.add(todayNgr)).toFixed(3),
      ngrThisMonth: new Decimal(overall?.ggrThisMonth || 0)
        .sub(monthNgr.plus(todayNgr))
        .toFixed(3),
      ngrThisWeek: new Decimal(overall?.ggrThisWeek || 0)
        .sub(weekNgr.add(todayNgr))
        .toFixed(3),
      ngrToday: new Decimal(overall?.ggrToday || 0).sub(todayNgr).toFixed(3),
    };
  }

  /// #endregion NGR

  async getGenericStatistics(): Promise<GenericStatisticsType> {
    const allUsersBalances = await this.balanceService.getBalancesWithUsers();

    const simplifiedData: SimplifiedBalanceData[] = allUsersBalances.map((userBalance) => {
      return {
        role: userBalance.user.userRoles[0].role.name,
        volumePlayed: userBalance.volumePlayed,
        totalWin: userBalance.totalWin,
        totalLoss: userBalance.totalLoss,
      };
    });
    const normalUserData = simplifiedData.filter(({ role }) => role === Roles.USER).map(simplifiedDataToGGRParams);
    const overallData = simplifiedData.map(simplifiedDataToGGRParams);
    const vipUserData = simplifiedData.filter(({ role }) => role === Roles.VIP_USER).map(simplifiedDataToGGRParams);

    let normalUserGGR;
    try {
      normalUserGGR = genericGgrComputation(normalUserData);
    } catch (error) {
      normalUserGGR = new Decimal(0);
    }

    let overallGGR;

    try {
      overallGGR = genericGgrComputation(overallData);
    } catch (error) {
      overallGGR = new Decimal(0);
    }

    let vipGGR;

    try {
      vipGGR = genericGgrComputation(vipUserData);
    } catch (error) {
      vipGGR = new Decimal(0);
    }

    return {
      normalUserGGR: decimalToNumber(normalUserGGR),
      overallGGR: decimalToNumber(overallGGR),
      vipGGR: decimalToNumber(vipGGR),
    };
  }
}
