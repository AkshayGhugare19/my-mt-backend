import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { AsyncLogModule } from '@infrastructure/log/async-log.module';
import { BonusModule } from '@modules/bonus/bonus.module';
import { CouponCodeDepositStrategy } from '@modules/coupon-code/bonus-strategy/deposit.strategy';
import { CouponCodeFlatBalanceStrategy } from '@modules/coupon-code/bonus-strategy/flat-balance.strategy';
import { CouponCodeAdminController } from '@modules/coupon-code/controller/coupon-code-admin.controller';
import { CouponCodeController } from '@modules/coupon-code/controller/coupon-code.controller';
import { CouponCodeRedeemService } from '@modules/coupon-code/service/coupon-code-redeem.service';
import { CouponCodeService } from '@modules/coupon-code/service/coupon-code.service';
import { Module } from '@nestjs/common';
import { CouponCodeGroupService } from './service/coupon-code-group.service';

@Module({
  imports: [PrismaModule, BonusModule, AsyncLogModule],
  controllers: [CouponCodeController, CouponCodeAdminController],
  providers: [
    CouponCodeService,
    CouponCodeRedeemService,
    CouponCodeGroupService,
    CouponCodeFlatBalanceStrategy,
    CouponCodeDepositStrategy,
  ],
  exports: [CouponCodeService],
})
export class CouponCodeModule {}
