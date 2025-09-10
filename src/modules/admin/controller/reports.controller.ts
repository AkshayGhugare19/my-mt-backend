/* eslint-disable sonarjs/no-duplicate-string */
import { PagePaginationResponse } from '@common/types';
import { $filters, Filterable } from '@meta/filters';
import { DepositService } from '@modules/deposits/service/deposit.service';
import { RequirePermissions, allOf, anyOf } from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { WithdrawalService } from '@modules/withdrawal/service/withdrawal.service';
import { BadRequestException, Controller, Get, InternalServerErrorException, Query } from '@nestjs/common';
import { decimalToNumber } from '@utils/decimal-do-number';
import { DepositReportItem, WithdrawalReportItem, BetReportFilters } from '../types';
import { BetReportsService } from '@modules/bet/service/bet-reports.service';
import { UserContext } from '@common/decorators/user-context.decorator';
import { JwtPayload } from '@modules/authentication/types';
import { TokenSettlementAdminDto } from '@modules/token-settlement/dto/token-settlement-admin.dto';
import { TokenSettlementService } from '@modules/token-settlement/service/token-settlement.service';
import { PermissionService } from '@modules/permission/service/permission.service';
import { TokenIssueService } from '@modules/token-issue/service/token-issue.service';
import { TokenIssueAdminDto } from '@modules/token-issue/dto/token-issue-admin.dto';
import { usdtToPoints } from '@utils/usdt-to-points';
import { TokenSettlementTypes } from '@modules/token-settlement/enum/token-settlement-type.enum';
import { Roles } from '@modules/role/enum/role.enum';
import { ApiTags } from '@nestjs/swagger';
import { ApiFilterQueryType, UseFilters } from '@meta/filters/decorator';
import { FileExporterService } from '@common/file-exporter/exporter';
import { BetExportMapper, UserBetReportKeysMapper } from '@modules/admin/exports/bet-export';
import { BetReportItem } from '@modules/bet/types';
import { BetReportSelectColumnsSchema, DepositsReportSelectColumnsSchema, UserBetReportKeys, WithdrawalsReportKeys, WithdrawalsReportSelectColumnsSchema } from '@modules/admin/query/reports-select-columns.query';
import { z } from 'zod';
import { ColumnMapperType } from '@common/file-exporter';
import { BucketService } from '@modules/media';
import { WithdrawalExportMapper, WithdrawalsReportKeysMapper } from '@modules/admin/exports/withdrawal-export';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { DepositsReportFilters } from '@modules/deposits/types';
import { WithdrawalsReportFilters } from '@modules/withdrawal/types';
import { DepositExportMapper, DepositsReportKeysMapper } from '@modules/admin/exports/deposit-export';

@ApiTags('Admin Reports')
@Controller('/admin/reports')
export class ReportsController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly depositService: DepositService,
    private readonly withdrawalService: WithdrawalService,
    private readonly betReportsService: BetReportsService,
    private readonly settlementService: TokenSettlementService,
    private readonly tokenIssueService: TokenIssueService,
    private readonly fileExporterService: FileExporterService,
    private readonly bucketService: BucketService,
  ) {}

  @Filterable('reports.deposits', true)
  private async depositFilters(): Promise<DepositsReportFilters> {
    const search = $filters.text('search', {
      lowercase: true,
      minLen: 3,
    });
    const date = $filters.dateInterval('date');
    const amountUSDT = $filters.range('amountUSDT', {
      display: 'Amount (USDT)',
      min: 0,
    });

    const amount = amountUSDT.map(([min, max]) => [usdtToPoints(min), usdtToPoints(max)] as [number, number]);

    return {
      search: search.value,
      interval: date.value,
      amount,
    };
  }

  @Get('/deposits')
  @RequirePermissions('admin', allOf(Permissions.READ_DEPOSITS_REPORTS))
  @UseFilters('reports.deposits')
  async deposits(): Promise<PagePaginationResponse<DepositReportItem>> {
    const filters = await this.depositFilters();
    const result = await this.depositService.getDeposits(
      filters,
      $filters.pagination.page(),
      $filters.pagination.limit(),
    );

    return {
      total: result.count,
      page: $filters.pagination.page(),
      limit: $filters.pagination.limit(),
      data: result.data.map((item) => ({
        id: item.id,
        date: item.created_at.toISOString(),
        amount: decimalToNumber(item.amount),
        userId: item.user_id,
        userEmail: item.user_email ?? undefined,
        userNickname: item.user_nickname ?? undefined,
        userWallet: item.user_wallet ?? undefined,
        proof: item.transaction_id,
        currency: item.currency,
        blockchain: item.blockchain,
        usdAmount: item.usd_amount,
        cryptoAmount: item.crypto_amount,
      })),
    };
  }

  @Get('/deposits/export')
  @RequirePermissions('admin', allOf(Permissions.READ_DEPOSITS_REPORTS))
  @UseFilters('reports.deposits')
  async depositsExport(
    @Query() query: unknown,
  ): Promise<string> {
    const filters = await this.depositFilters();
    const parsedQuery = DepositsReportSelectColumnsSchema.safeParse(query);
    if (!parsedQuery.success) {
      throw new BadRequestException(ErrorMessages.BAD_REQUEST);
    }
    const { columns, fileType } = parsedQuery.data;
    const file = await this.fileExporterService.export<Record<keyof typeof DepositsReportKeysMapper, string>>(
      async (page, limit) => {
        const data = await this.depositService.getDepositsExport(filters, { page, limit })
        if (!data.length) {
          return null;
        }

        return data.map((item) => DepositExportMapper.toItem(item));
      },
      {
        columnMapper: columns
          ? columns.reduce((acc, key) => {
            acc[key] = DepositsReportKeysMapper[key as keyof typeof DepositsReportKeysMapper];
            return acc;
          }, {} as ColumnMapperType)
          : DepositsReportKeysMapper,
        fileType: fileType ?? 'csv',
        filename: 'deposits',
      },
    );
    if (!file) {
      throw new BadRequestException(ErrorMessages.CANNOT_EXPORT_EMPTY_DATA);
    }
    try {
      return this.bucketService.uploadFile('reports', file, { ACL: 'public-read' });
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  @Filterable('reports.withdrawals', true)
  private async withdrawalFilters(): Promise<WithdrawalsReportFilters> {
    const search = $filters.text('search', {
      lowercase: true,
      minLen: 3,
    });
    const date = $filters.dateInterval('date');
    const amountUSDT = $filters.range('amountUSDT', {
      display: 'Amount (USDT)',
      min: 0,
    });

    const amount = amountUSDT.map(([min, max]) => [min, max] as [number, number]);

    const includePending = $filters.boolean('pending', {
      display: 'Include pending withdrawals',
      default: true,
    });

    return {
      search: search.value,
      date: date.value,
      amount,
      includePending,
    };
  }

  @Get('/withdrawals')
  @RequirePermissions('admin', allOf(Permissions.READ_WITHDRAWALS_REPORTS))
  @UseFilters('reports.withdrawals')
  async withdrawals(): Promise<PagePaginationResponse<WithdrawalReportItem>> {
    const { search, date, amount, includePending } = await this.withdrawalFilters();
    const count = await this.withdrawalService.getAllRequestCount({
      filters: {
        search,
        startDate: date?.[0],
        endDate: date?.[1],
        amountMin: amount?.[0],
        amountMax: amount?.[1],
        status: includePending ? undefined : ['ACCEPTED', 'AUTO_ACCEPTED', 'FAILED', 'FULFILLED', 'REJECTED'], // all excluding pending
        page: 0,
        limit: 0,
      },
    });

    const result = await this.withdrawalService.getAllRequests({
      filters: {
        search,
        startDate: date?.[0],
        endDate: date?.[1],
        amountMin: amount?.[0],
        amountMax: amount?.[1],
        status: includePending ? undefined : ['ACCEPTED', 'AUTO_ACCEPTED', 'FAILED', 'FULFILLED', 'REJECTED'], // all excluding pending
        page: $filters.pagination.page(),
        limit: $filters.pagination.limit(),
      },
    });

    return {
      total: count,
      page: $filters.pagination.page(),
      limit: $filters.pagination.limit(),
      data: result.map((item) => ({
        id: item.id,
        status: item.status,
        date: item.createdAt.toISOString(),
        amount: decimalToNumber(item.amount),
        userId: item.userId,
        userEmail: item.user.email ?? undefined,
        userNickname: item.user.nickname ?? undefined,
        userWallet: item.user.wallet ?? undefined,
        proof: item.transactionHash ?? undefined,
        currency: item.currency,
        targetWallet: item.targetWallet,
        blockchain: item.blockchain ?? undefined,
        usdAmount: item.usdAmount?.toNumber(),
      })),
    };
  }

  @Get('/withdrawals/export')
  @RequirePermissions('admin', allOf(Permissions.READ_WITHDRAWALS_REPORTS))
  @UseFilters('reports.withdrawals',
    z.object({
      columns: z.array(WithdrawalsReportKeys),
      fileType: z.enum(['csv', 'pdf']).optional(),
    }),
  )
  async withdrawalsExport(
  @Query() query: unknown,
  ): Promise<string> {
    const filters = await this.withdrawalFilters();
    const parsedQuery = WithdrawalsReportSelectColumnsSchema.safeParse(query);
    if (!parsedQuery.success) {
      throw new BadRequestException(ErrorMessages.BAD_REQUEST);
    }
    const { columns, fileType } = parsedQuery.data;

    const file = await this.fileExporterService.export<Record<keyof typeof WithdrawalsReportKeysMapper, string>>(
      async (page, limit) => {
        const data = await this.withdrawalService.getWithdrawalsExport(filters, { page, limit })
        if (!data.length) {
          return null;
        }

        return data.map((item) => WithdrawalExportMapper.toItem(item));
      },
      {
        columnMapper: columns
          ? columns.reduce((acc, key) => {
            acc[key] = WithdrawalsReportKeysMapper[key as keyof typeof WithdrawalsReportKeysMapper];
            return acc;
          }, {} as ColumnMapperType)
          : WithdrawalsReportKeysMapper,
        fileType: fileType ?? 'csv',
        filename: 'withdrawals',
      },
    );

    if (!file) {
      throw new BadRequestException(ErrorMessages.CANNOT_EXPORT_EMPTY_DATA);
    }

    try {
      return this.bucketService.uploadFile('reports', file, { ACL: 'public-read' });
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  @Filterable('reports.bets', true)
  private async betFilters(): Promise<BetReportFilters> {
    const userSearch = $filters.text('userSearch', {
      display: 'User search',
      lowercase: true,
      minLen: 3,
    });

    const date = $filters.dateInterval('date');

    const amountUSDT = $filters.range('amountUSDT', {
      display: 'Amount (USDT)',
      min: 0,
    });

    const amount = amountUSDT.map(([min, max]) => [usdtToPoints(min), usdtToPoints(max)] as [number, number]);

    const odds = $filters.range('odds', {
      min: 0,
    });

    const outcomeWin = $filters.boolean('outcomeWin', {
      display: 'Win',
      default: true,
    });
    const outcomeLoss = $filters.boolean('outcomeLoss', {
      display: 'Loss',
      default: true,
    });
    const outcomeCashOut = $filters.boolean('outcomeCashOut', {
      display: 'Cash Out',
      default: false,
    });

    const outcomePending = $filters.boolean('outcomePending', {
      display: 'Pending',
      default: false,
    });

    const categoryGames = $filters.boolean('categoryGames', {
      display: 'Games',
      default: true,
    });
    const categorySportsbook = $filters.boolean('categorySportsbook', {
      display: 'Sportsbook',
      default: true,
    });
    const categorySportsExchange = $filters.boolean('categorySportsExchange', {
      display: 'Sports Exchange',
      default: true,
    });

    return {
      userSearch,
      amount,
      date,
      odds,
      outcomeWin,
      outcomeLoss,
      outcomeCashOut,
      outcomePending,
      categoryGames,
      categorySportsbook,
      categorySportsExchange,
    };
  }

  @Get('/bets')
  @RequirePermissions(
    'admin',
    anyOf(
      Permissions.READ_BETS_REPORTS,
      Permissions.READ_OWN_BETS_REPORTS,
      Permissions.READ_LIVE_BETS,
      Permissions.READ_OWN_LIVE_BETS,
    ),
  )
  @UseFilters('reports.bets')
  async bets(@UserContext() { sub }: JwtPayload): Promise<PagePaginationResponse<BetReportItem>> {
    const {
      userSearch,
      date,
      amount,
      odds,
      outcomeWin,
      outcomeLoss,
      outcomePending,
      outcomeCashOut,
      categoryGames,
      categorySportsbook,
      categorySportsExchange,
    } = await this.betFilters();

    const { data, count } = await this.betReportsService.getAllGameBets(
      {
        userSearch: userSearch && userSearch.value,
        interval: date && date.value,
        outcomeWin,
        outcomeLoss,
        outcomePending,
        outcomeCashOut,
        categoryGames,
        categorySportsbook,
        categorySportsExchange,
        amount,
        odds: odds && odds.value,
      },
      sub,
      $filters.pagination.page(),
      $filters.pagination.limit(),
    );

    return {
      total: count,
      page: $filters.pagination.page(),
      limit: $filters.pagination.limit(),
      data,
    };
  }

  @Get('/bets/export')
  @RequirePermissions('admin', anyOf(Permissions.READ_BETS_REPORTS))
  @UseFilters(
    'reports.bets',
    z.object({
      columns: z.array(UserBetReportKeys),
      fileType: z.enum(['csv', 'pdf']).optional(),
    }),
  )
  async getUserGameBets(
    @Query() query: unknown, // before: BetReportSelectColumnsQuery | can't use a DTO here because it will remove filter data from the query object!
    @UserContext() { sub }: JwtPayload,
  ): Promise<string> {
    const {
      userSearch,
      date,
      amount,
      odds,
      outcomeWin,
      outcomeLoss,
      outcomePending,
      outcomeCashOut,
      categoryGames,
      categorySportsbook,
      categorySportsExchange,
    } = await this.betFilters();

    const { columns, fileType } = BetReportSelectColumnsSchema.parse(query);

    const file = await this.fileExporterService.export<Record<keyof typeof UserBetReportKeysMapper, string>>(
      async (page, limit) => {
        const { data } = await this.betReportsService.getAllGameBets(
          {
            userSearch: userSearch?.value,
            interval: date?.value,
            outcomeWin,
            outcomeLoss,
            outcomePending,
            outcomeCashOut,
            categoryGames,
            categorySportsbook,
            categorySportsExchange,
            amount,
            odds: odds?.value,
          },
          sub,
          page,
          limit,
        );
        if (!data.length) {
          return null;
        }

        return data.map((item) => BetExportMapper.toBetReportItem(item));
      },
      {
        columnMapper: columns
          ? columns.reduce((acc, key) => {
            acc[key] = UserBetReportKeysMapper[key as keyof typeof UserBetReportKeysMapper];
            return acc;
          }, {} as ColumnMapperType)
          : UserBetReportKeysMapper,
        fileType: fileType ?? 'csv',
        filename: 'bets',
      },
    );

    if (!file) {
      throw new BadRequestException(ErrorMessages.CANNOT_EXPORT_EMPTY_DATA);
    }

    try {
      return this.bucketService.uploadFile('reports', file, { ACL: 'public-read' });
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  @Get('/settlements')
  @RequirePermissions('admin', anyOf(Permissions.READ_SETTLEMENTS_REPORTS, Permissions.READ_OWN_SETTLEMENTS_REPORTS))
  @ApiFilterQueryType('reports.settlements')
  @Filterable('reports.settlements')
  async settlements(@UserContext() { sub }: JwtPayload): Promise<PagePaginationResponse<TokenSettlementAdminDto>> {
    const userSearch = $filters.text('userSearch', {
      display: 'User search',
      lowercase: true,
      minLen: 3,
    });

    const date = $filters.dateInterval('date');

    const amountUSDT = $filters.range('amountUSDT', {
      display: 'Amount (USDT)',
      min: 0,
    });

    const includeMaster = $filters.boolean('includeMaster', {
      display: 'Include Master Settlements',
      default: true,
    });

    const includeVIP = $filters.boolean('includeVIP', {
      display: 'Include VIP Settlements',
      default: true,
    });

    const amount = amountUSDT.map(([min, max]) => [usdtToPoints(min), usdtToPoints(max)] as [number, number]);

    const permissions = await this.permissionService.getUserPermissions(sub);
    const onlyShowOwn = permissions.some((permission) => permission === Permissions.READ_OWN_SETTLEMENTS_REPORTS);

    const requests = await this.settlementService.getTokenSettlementRequestsByPermissions({
      requesterId: sub,
      filter: {
        createdAt: date.value
          ? {
              gte: date.value?.[0],
              lte: date.value?.[1],
            }
          : undefined,
        amount: amount
          ? {
              gte: amount?.[0],
              lte: amount?.[1],
            }
          : undefined,
        type: {
          in: [
            ...(includeMaster ? [TokenSettlementTypes.MASTER] : []),
            ...(includeVIP ? [TokenSettlementTypes.VIP] : []),
          ],
        },
        user: {
          OR: userSearch.value
            ? [
                {
                  email: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  nickname: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  wallet: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  id: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  playerTag: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
              ]
            : undefined,
        },
        OR: onlyShowOwn
          ? [
              {
                masterId: sub,
              },
              {
                targetId: sub,
              },
            ]
          : undefined,
      },
      targetId: undefined,
      page: $filters.pagination.page(),
      limit: $filters.pagination.limit(),
    });

    return {
      data: requests.data.map((request) => TokenSettlementAdminDto.from(request)),
      limit: requests.limit,
      page: requests.page,
      total: requests.total,
    };
  }

  @Get('/topups')
  @RequirePermissions('admin', anyOf(Permissions.READ_TOP_UPS_REPORTS, Permissions.READ_OWN_TOP_UPS_REPORTS))
  @ApiFilterQueryType('reports.topups')
  @Filterable('reports.topups')
  async topups(@UserContext('sub') sub: string): Promise<PagePaginationResponse<TokenIssueAdminDto>> {
    const userSearch = $filters.text('userSearch', {
      display: 'User search',
      lowercase: true,
      minLen: 3,
    });

    const date = $filters.dateInterval('date');

    const amountUSDT = $filters.range('amountUSDT', {
      display: 'Amount (USDT)',
      min: 0,
    });

    const includeMaster = $filters.boolean('includeMaster', {
      display: 'Include Master Settlements',
      default: true,
    });

    const includeVIP = $filters.boolean('includeVIP', {
      display: 'Include VIP Settlements',
      default: true,
    });

    const amount = amountUSDT.map(([min, max]) => [usdtToPoints(min), usdtToPoints(max)] as [number, number]);

    const permissions = await this.permissionService.getUserPermissions(sub);
    const onlyShowOwn = permissions.some((permission) => permission === Permissions.READ_OWN_TOP_UPS_REPORTS);

    const requests = await this.tokenIssueService.getAllTokenRequests({
      filter: {
        createdAt: date.value
          ? {
              gte: date.value?.[0],
              lte: date.value?.[1],
            }
          : undefined,
        amount: amount
          ? {
              gte: amount?.[0],
              lte: amount?.[1],
            }
          : undefined,
        requester: {
          userRoles: {
            some: {
              role: {
                name: {
                  in: [...(includeMaster ? [Roles.MASTER] : []), ...(includeVIP ? [Roles.VIP_USER] : [])],
                },
              },
            },
          },
          OR: userSearch.value
            ? [
                {
                  email: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  nickname: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  wallet: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  id: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  playerTag: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
              ]
            : undefined,
        },
        OR: onlyShowOwn
          ? [
              {
                masterId: sub,
              },
              {
                requesterId: sub,
              },
            ]
          : undefined,
      },
      limit: $filters.pagination.limit(),
      page: $filters.pagination.page(),
    });
    return {
      data: requests.data.map((request) => TokenIssueAdminDto.fromTokenIssueWithRequester(request)),
      limit: requests.limit,
      page: requests.page,
      total: requests.total,
    };
  }
}
