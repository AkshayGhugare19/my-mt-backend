import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Query,
} from '@nestjs/common';
import { StatisticsService } from '../service/statistics.service';
import { AllStatistics } from '@modules/statistics/dtos/all-statistics.dto';
import {
  StatisticsRangeQuery,
  StatisticsTargetQuery,
} from '@modules/statistics/query/statistics-target.query';
import {
  RequirePermissions,
  allOf,
  anyOf,
} from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { UserContext } from '@common/decorators/user-context.decorator';
import { PermissionService } from '@modules/permission/service/permission.service';
import { ForRoles } from '@common/decorators/for-roles.decorator';
import { Roles } from '@modules/role/enum/role.enum';
import { PagePaginationResponse } from '@common/types';
import { GetTransactionHistoryDto } from '@modules/statistics/dtos/get-transaction-history.dto';
import { UserStatisticsService } from '../service/user-statistics.service';
import { UserTransactionsDto } from '../dtos/user-transactions.dto';
import { GgrStatisticsRange } from '@modules/statistics/dtos/ggr-statistics.dto';

@Controller('statistics')
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly permissionService: PermissionService,
    private readonly userStatisticsService: UserStatisticsService,
  ) {}

  @Get('/general')
  @RequirePermissions(
    'admin',
    allOf(Permissions.READ_DASHBOARD),
    anyOf(
      Permissions.READ_STATISTICS,
      Permissions.READ_STATISTICS_VIP,
      Permissions.READ_STATISTICS_USER,
    ),
  )
  async genericPlatformStatistics(
    @UserContext() { sub }: { sub: string },
    @Query() { target }: StatisticsTargetQuery,
    @Headers('Time-Zone') timeZone: string,
  ): Promise<AllStatistics> {
    const permissions = await this.permissionService.getUserPermissions(sub);
    switch (target) {
      case 'vip':
        if (!permissions.includes(Permissions.READ_STATISTICS_VIP)) {
          throw new ForbiddenException();
        }
        break;
      case 'user':
        if (!permissions.includes(Permissions.READ_STATISTICS_USER)) {
          throw new ForbiddenException();
        }
        break;
      default:
        if (!permissions.includes(Permissions.READ_STATISTICS)) {
          throw new ForbiddenException();
        }
        break;
    }
    const [ggr, users, funds] = [
      await this.statisticsService.getGgrStatistics(sub, target),
      await this.statisticsService.getUsersStatisticsByPermission(
        sub,
        target,
        timeZone,
      ),
      await this.statisticsService.getFundsStatistics(sub, target),
    ];

    return {
      ggr,
      users,
      funds: Object.values(funds || {}).some((value) => !!value)
        ? funds
        : undefined,
    };
  }

  @Get('/general/range')
  @RequirePermissions(
    'admin',
    allOf(Permissions.READ_DASHBOARD),
    anyOf(
      Permissions.READ_STATISTICS,
      Permissions.READ_STATISTICS_VIP,
      Permissions.READ_STATISTICS_USER,
    ),
  )
  async genericPlatformStatisticsRange(
    @UserContext() { sub }: { sub: string },
    @Query() { target, startDate, endDate }: StatisticsRangeQuery,
  ): Promise<GgrStatisticsRange | undefined> {
    const permissions = await this.permissionService.getUserPermissions(sub);
    switch (target) {
      case 'vip':
        if (!permissions.includes(Permissions.READ_STATISTICS_VIP)) {
          throw new ForbiddenException();
        }
        break;
      case 'user':
        if (!permissions.includes(Permissions.READ_STATISTICS_USER)) {
          throw new ForbiddenException();
        }
        break;
      default:
        if (!permissions.includes(Permissions.READ_STATISTICS)) {
          throw new ForbiddenException();
        }
        break;
    }
    return await this.statisticsService.getGgrStatisticsRange(
      sub,
      target,
      {
        startDate,
        endDate,
      },
    );
  }

  @Get('/transaction-history')
  @ForRoles([Roles.USER, Roles.VIP_USER])
  async getTransactionHistory(
    @UserContext('sub') userId: string,
    @Query() params: GetTransactionHistoryDto,
  ): Promise<PagePaginationResponse<UserTransactionsDto>> {
    const result = await this.userStatisticsService.getTransactionHistory(
      userId,
      params,
    );
    return {
      ...result,
      data: result.data.map(UserTransactionsDto.from),
    };
  }
}
