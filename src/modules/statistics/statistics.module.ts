import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { BalanceModule } from '@modules/balance/balance.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { StatisticsController } from './controller/statistics.controller';
import { StatisticsService } from './service/statistics.service';
import { UsersStatisticsService } from '@modules/statistics/service/users-statistics.service';
import { FundsStatisticsService } from '@modules/statistics/service/funds-statistics.service';
import { GgrStatisticsService } from '@modules/statistics/service/ggr-statistics.service';
import { TokenIssueStatisticsService } from '@modules/statistics/service/token-issue-statistics.service';
import { PermissionModule } from '@modules/permission/permission.module';
import { UserStatisticsService } from './service/user-statistics.service';
import { BetModule } from '@modules/bet/bet.module';
import { EvenBetModule } from '@modules/betting-providers/evenbet/evenbet.module';
import { RoleModule } from '@modules/role/role.module';
@Module({
  imports: [
    UserModule,
    BalanceModule,
    PrismaModule,
    PermissionModule,
    BetModule,
    EvenBetModule,
    RoleModule,
  ],
  controllers: [StatisticsController],
  providers: [
    StatisticsService,
    UsersStatisticsService,
    FundsStatisticsService,
    GgrStatisticsService,
    TokenIssueStatisticsService,
    UserStatisticsService,
  ],
})
export class StatisticsModule {}
