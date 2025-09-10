import { UserContext } from '@common/decorators/user-context.decorator';
import { PagePaginationResponse } from '@common/types';
import { $filters } from '@meta/filters';
import { ApiFilterQueryType, Filterable } from '@meta/filters/decorator';
import { CouponCodeAdminDto } from '@modules/coupon-code/dto/coupon-code-admin.dto';
import { CouponCodeRedeemAdminDto } from '@modules/coupon-code/dto/coupon-code-redeem-admin.dto';
import { CouponCodeReportDto } from '@modules/coupon-code/dto/coupon-code-report.dto';
import { CreateCouponCodeDto } from '@modules/coupon-code/dto/create-coupon-code.dto';
import {
  FilterCouponCodeRedeemsDto,
  FilterCouponCodeRedeemsSchema,
} from '@modules/coupon-code/dto/filter-coupon-code-redeems.dto';
import {
  FilterCouponCodesDto,
  FilterCouponCodesSchema,
} from '@modules/coupon-code/dto/filter-coupon-codes.dto';
import { UpdateCouponCodeDto } from '@modules/coupon-code/dto/update-coupon-code.dto';
import { CouponCodeService } from '@modules/coupon-code/service/coupon-code.service';
import {
  anyOf,
  RequirePermissions,
} from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { usdtToPoints } from '@utils/usdt-to-points';
import { CouponGroupReportDto } from '../dto/coupon-group-report.dto';
import { FilterCouponGroupsDto, FilterCouponGroupsSchema } from '../dto/filter-coupon-groups.dto';
import { CouponCodeGroupService } from '../service/coupon-code-group.service';
import { CreateCouponGroupDto } from '../dto/create-coupon-group.dto';
import { CouponGroup } from '@prisma/client';

@ApiTags('Coupon Codes (Admin)')
@Controller('admin/coupon-codes')
export class CouponCodeAdminController {
  constructor(
    private readonly couponCodeService: CouponCodeService,
    private readonly couponCodeGroupService: CouponCodeGroupService,
  ) {}

  @Post()
  @RequirePermissions('admin', anyOf(Permissions.CREATE_COUPON_CODES))
  async createCouponCode(
    @UserContext('sub') adminId: string,
    @Body() createCouponCodeDto: CreateCouponCodeDto,
  ): Promise<CouponCodeAdminDto> {
    const savedCode = await this.couponCodeService.createCouponCode(
      adminId,
      createCouponCodeDto,
    );
    return CouponCodeAdminDto.from(savedCode);
  }

  @Patch('/:id/disable')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_COUPON_CODES))
  async disableCouponCode(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CouponCodeAdminDto> {
    const result = await this.couponCodeService.disableCouponCode(id);
    return CouponCodeAdminDto.from(result);
  }

  @Patch('/:id/enable')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_COUPON_CODES))
  async enableCouponCode(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CouponCodeAdminDto> {
    const result = await this.couponCodeService.enableCouponCode(id);
    return CouponCodeAdminDto.from(result);
  }

  @Patch('/:id')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_COUPON_CODES))
  async updateCouponCode(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCouponCodeDto: UpdateCouponCodeDto,
  ): Promise<CouponCodeAdminDto> {
    const updatedCode = await this.couponCodeService.updateCouponCode(
      id,
      updateCouponCodeDto,
    );
    return CouponCodeAdminDto.from(updatedCode);
  }

  @Patch('group/:id')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_COUPON_GROUP))
  async updateGroup(
  @Param('id', ParseIntPipe) id: number,
  @Body() updateDto: CreateCouponGroupDto,
  ): Promise<CouponGroupReportDto> {
    const updatedGroup = await this.couponCodeGroupService.updateGroup(id, updateDto);
    return CouponGroupReportDto.from(updatedGroup);
  }

  @Delete(':id')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_COUPON_CODES))
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCouponCode(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.couponCodeService.deleteCouponCode(id);
  }

  @Delete('group/:id')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_COUPON_GROUP))
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteGroup(
  @Param('id', ParseIntPipe) id: number,
  ): Promise<CouponGroupReportDto> {
    const group = await this.couponCodeGroupService.softDeleteGroup(id);
    return CouponGroupReportDto.from(group);
  }

  @Get()
  @ApiFilterQueryType('coupon-codes')
  @RequirePermissions('admin', anyOf(Permissions.READ_COUPON_CODES))
  @Filterable('coupon-codes')
  async filterCouponCodes(): Promise<
    PagePaginationResponse<CouponCodeReportDto>
    // eslint-disable-next-line indent
  > {
    const creatorNickname = $filters.text('creatorNickname', {
      display: 'Creator nickname',
    });

    const code = $filters.text('code', {
      display: 'Coupon code',
    });

    const type = $filters.number('type', {
      display: 'Coupon code type',
    });

    const usdAmountInterval = $filters.range('usdAmountInterval', {
      display: 'Amount (USD)',
    });
    const pointsAmountInterval = usdAmountInterval.map(
      ([min, max]) =>
        [usdtToPoints(min), usdtToPoints(max)] as [number, number],
    );

    const currentStockInterval = $filters.range('currentStockInterval', {
      display: 'Current stock interval',
    });

    const totalStockInterval = $filters.range('totalStockInterval', {
      display: 'Total stock interval',
    });

    const expiryDateInterval = $filters.dateInterval('expiryDateInterval', {
      display: 'Expiry date interval',
    });

    const filterCouponCodesDto = FilterCouponCodesSchema.parse({
      creatorNickname: creatorNickname.value,
      code: code.value,
      type: type.value,
      minAmount: pointsAmountInterval?.[0],
      maxAmount: pointsAmountInterval?.[1],
      minCurrentStock: currentStockInterval.value?.[0],
      maxCurrentStock: currentStockInterval.value?.[1],
      minTotalStock: totalStockInterval.value?.[0],
      maxTotalStock: totalStockInterval.value?.[1],
      minExpiryDate: expiryDateInterval?.value?.[0],
      maxExpiryDate: expiryDateInterval?.value?.[1],
      page: $filters.pagination.page(),
      limit: $filters.pagination.limit(),
    } as FilterCouponCodesDto);

    const result =
      await this.couponCodeService.filterCouponCodes(filterCouponCodesDto);
    return {
      data: result.data.map((item) => CouponCodeReportDto.from(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get('redeems')
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @RequirePermissions('admin', anyOf(Permissions.READ_COUPON_CODES))
  @Filterable('coupon-code.redeems')
  @ApiFilterQueryType('coupon-code.redeems')
  async filterCouponCodeRedeems(): Promise<
    PagePaginationResponse<CouponCodeRedeemAdminDto>
    // eslint-disable-next-line indent
  > {
    const casinoPlayerId = $filters.text('casinoPlayerId', {
      display: 'Casino Player ID',
    });

    const redeemerWallet = $filters.text('redeemerWallet', {
      display: 'Redeemer wallet',
    });

    const code = $filters.text('code', {
      display: 'Coupon code',
    });

    const usdAmountInterval = $filters.range('usdAmountInterval', {
      display: 'Amount (USD)',
    });
    const pointsAmountInterval = usdAmountInterval.map(
      ([min, max]) =>
        [usdtToPoints(min), usdtToPoints(max)] as [number, number],
    );

    const redeemDateInterval = $filters.dateInterval('redeemDateInterval', {
      display: 'Redeem date interval',
    });

    const filterCouponCodeRedeemsDto = FilterCouponCodeRedeemsSchema.parse({
      casinoPlayerId: casinoPlayerId.value,
      redeemerWallet: redeemerWallet.value,
      code: code.value,
      minAmount: pointsAmountInterval?.[0],
      maxAmount: pointsAmountInterval?.[1],
      minRedeemDate: redeemDateInterval.value?.[0],
      maxRedeemDate: redeemDateInterval.value?.[1],
      page: $filters.pagination.page(),
      limit: $filters.pagination.limit(),
    } as FilterCouponCodeRedeemsDto);

    const result = await this.couponCodeService.filterCouponCodeRedeems(
      filterCouponCodeRedeemsDto,
    );

    return {
      data: result.data.map((item) => CouponCodeRedeemAdminDto.from(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get('groups')
  @ApiFilterQueryType('coupon-groups')
  @RequirePermissions('admin', anyOf(Permissions.READ_COUPON_GROUP))
  @Filterable('coupon-groups')
  async filterCouponGroups(): Promise<
  PagePaginationResponse<CouponGroupReportDto>
  > {
    const name = $filters.text('name', {
      display: 'Group name',
    });

    const filterDto = FilterCouponGroupsSchema.parse({
      name: name.value,
      page: $filters.pagination.page(),
      limit: $filters.pagination.limit(),
    } as FilterCouponGroupsDto);

    const result =
    await this.couponCodeGroupService.filterCouponGroups(filterDto);

    return {
      data: result.data.map((group) => CouponGroupReportDto.from(group)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Post('group')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_COUPON_GROUP))
  async createGroup(
    @Body() createDto: CreateCouponGroupDto,
  ): Promise<CouponGroup> {
    return await this.couponCodeGroupService.createGroup(createDto);
  }
}
