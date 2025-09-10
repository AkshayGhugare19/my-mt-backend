import { ForRoles } from '@common/decorators/for-roles.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { CouponCodeService } from '@modules/coupon-code/service/coupon-code.service';
import { Roles } from '@modules/role/enum/role.enum';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CouponCodeRedeemService } from '@modules/coupon-code/service/coupon-code-redeem.service';
import { CouponCodeRedeemDto } from '@modules/coupon-code/dto/coupon-code-redeem.dto';
import { PagePaginationQueryDto } from '@common/query/page-pagination.query';
import { PagePaginationResponse } from '@common/types';
import { Public } from '@common/decorators/public-route.decorator';

@ApiTags('Coupon Codes')
@Controller('coupon-codes')
export class CouponCodeController {
  constructor(
    private readonly couponCodeService: CouponCodeService,
    private readonly couponCodeRedeemService: CouponCodeRedeemService,
  ) {}

  @Post('redeems/:code')
  @HttpCode(HttpStatus.OK)
  @ForRoles([Roles.USER, Roles.VIP_USER])
  async redeemCouponCode(
    @UserContext('sub') userId: string,
    @Param('code') code: string,
  ): Promise<CouponCodeRedeemDto> {
    const couponCodeRedeem =
      await this.couponCodeRedeemService.redeemCouponCode(userId, code);

    return CouponCodeRedeemDto.from(couponCodeRedeem);
  }

  @Get('redeems')
  @ForRoles([Roles.USER, Roles.VIP_USER])
  async filterCouponCodeRedeems(
    @UserContext('sub') userId: string,
    @Query() getCouponCodeRedeemsDto: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<CouponCodeRedeemDto>> {
    const result = await this.couponCodeService.getCouponCodeRedeems(
      userId,
      getCouponCodeRedeemsDto,
    );
    return {
      ...result,
      data: result.data.map(CouponCodeRedeemDto.from),
    };
  }

  @Get('verifyCode/:code')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Param('code') code: string): Promise<{ result: boolean }> {
    const result = await this.couponCodeRedeemService.verifyCouponCode(code);
    return {
      result,
    };
  }
}
