import { AdminModule } from '@modules/admin/admin.module';
import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { BetModule } from '@modules/bet/bet.module';
import { BettingProvidersModule } from '@modules/betting-providers';
import { DepositModule } from '@modules/deposits/deposit.module';
import { TokenIssueModule } from '@modules/token-issue/token-issue.module';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { DepositTransactionModule } from './deposits/deposit-transaction.module';
import { StatisticsModule } from './statistics/statistics.module';
import { TokenSettlementModule } from '@modules/token-settlement/token-settlement.module';
import { WithdrawalModule } from '@modules/withdrawal/withdrawal.module';
import { RoleModule } from '@modules/role/role.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtGuard } from '@modules/authentication/core/guards/jwt.guard';
import { JwtAdminGuard } from '@modules/authentication/credentials/guard/jwt-admin.guard';
import { PermissionGuard } from '@modules/permission/guards/permission.guard';
import { PermissionModule } from '@modules/permission/permission.module';
import { GamesModule } from './games/games.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BonusModule } from '@modules/bonus/bonus.module';
import { JwtBlacklistGuard } from '@modules/authentication/core/guards/jwt-blacklist.guard';
import { BlacklistGuard } from '@modules/authentication/core/guards/blacklist.guard';
import { TipModule } from '@modules/tip/tip.module';
import { CouponCodeModule } from '@modules/coupon-code/coupon-code.module';
import { MediaModule } from './media';
import { AvatarModule } from '@modules/avatar/avatar.module';
import { RewardModule } from '@modules/reward/reward.module';
import { CountryProvidersBlacklistModule } from '@modules/country-providers/country-providers-blacklist.module';

@Module({
  imports: [
    TokenIssueModule,
    DepositModule,
    UserModule,
    AuthenticationModule,
    TransactionLedgerModule,
    BetModule,
    StatisticsModule,
    DepositTransactionModule,
    AdminModule,
    TokenSettlementModule,
    WithdrawalModule,
    BettingProvidersModule,
    RoleModule,
    PermissionModule,
    GamesModule,
    NotificationsModule,
    BonusModule,
    TipModule,
    CouponCodeModule,
    MediaModule,
    AvatarModule,
    RewardModule,
    CountryProvidersBlacklistModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAdminGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtBlacklistGuard,
    },
    {
      provide: APP_GUARD,
      useClass: BlacklistGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class Modules {}
