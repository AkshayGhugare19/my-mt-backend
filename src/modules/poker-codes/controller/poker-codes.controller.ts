import { PagePaginationResponse } from '@common/types';
import { allOf, RequirePermissions } from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CreatePokerCodesDto } from '../dto/create-poker-codes.dto';
import { PokerCodeResponseDto } from '../dto/poker-code.response.dto';
import { UpdatePokerCodeDto } from '../dto/update-poker-code.dto';
import { GetPokerCodesFiltersQuery } from '../query/get-poker-codes-filters.query';
import { PokerCodesService } from '../service/poker-codes.service';
import { UserContext } from '@common/decorators/user-context.decorator';
import { PokerCodeDistributionsResponseDto } from '../dto/poker-code-distribution.response.dto';
import { MyPokerCodeResponseDto } from '../dto/my-poker-code.response.dto';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { UserService } from '@modules/user/services/user.service';
import { $filters, Filterable } from '@meta/filters';

@Controller('poker-codes')
export class PokerCodesController {
  constructor(
    private readonly pokerCodesService: PokerCodesService,
    private readonly userService: UserService,
  ) {}

  @Get()
  @RequirePermissions('admin', allOf(Permissions.READ_POKER_CODES))
  @Filterable('poker-codes')
  async getPokerCodes(): Promise<PagePaginationResponse<PokerCodeResponseDto>> {
    const code = $filters.text('code', {
      display: 'Code',
    });

    const useLimit = $filters.number('useLimit', { display: 'Use Limit' });

    const reuseLimit = $filters.number('reuseLimit', {
      display: 'Reuse Limit',
    });

    const depositRangeFrom = $filters.number('depositRangeFrom', {
      display: 'Deposit Range From',
    });

    const depositRangeTo = $filters.number('depositRangeTo', {
      display: 'Deposit Range To',
    });

    const isDisabled = $filters.boolean('isDisabled', {
      display: 'Is Disabled',
      default: undefined,
    });

    const isHighRoller = $filters.boolean('isHighRoller', {
      display: 'Is High Roller',
      default: undefined,
    });

    const dateInterval = $filters.dateInterval('dateInterval');

    const { data, limit, page, total } = await this.pokerCodesService.getPokerCodes({
      code: code.value,
      useLimit: useLimit.value,
      reuseLimit: reuseLimit.value,
      depositRangeFrom: depositRangeFrom.value,
      depositRangeTo: depositRangeTo.value,
      isDisabled,
      isHighRoller,
      startDate: dateInterval.value?.[0],
      endDate: dateInterval.value?.[1],
      page: $filters.pagination.page(),
      limit: $filters.pagination.limit(),
    });

    const pokerCodes = data.map((pk) => new PokerCodeResponseDto(pk));

    return {
      data: pokerCodes,
      limit,
      page,
      total,
    };
  }

  @Post()
  @RequirePermissions('admin', allOf(Permissions.CREATE_POKER_CODES))
  async createPokerCodes(
    @Body() body: CreatePokerCodesDto,
    @UserContext('sub') userId: string,
  ): Promise<{ duplicateCodes: string[] }> {
    return await this.pokerCodesService.createPokerCodes(body, userId);
  }

  @Patch('/:id')
  @RequirePermissions('admin', allOf(Permissions.EDIT_POKER_CODES))
  async editPokerCode(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePokerCodeDto,
  ): Promise<PokerCodeResponseDto> {
    const updatedPokerCode = await this.pokerCodesService.updatePokerCode(id, body);

    return new PokerCodeResponseDto(updatedPokerCode);
  }

  @Patch('/:id/status')
  @RequirePermissions('admin', allOf(Permissions.EDIT_POKER_CODES))
  async disableOrDeletePokerCode(@Param('id', ParseIntPipe) id: number): Promise<number> {
    const isCodeInUse = await this.pokerCodesService.checkIfPokerCodeWasUsed(id);

    if (isCodeInUse) {
      return this.pokerCodesService.disablePokerCode(id);
    }

    return this.pokerCodesService.deletePokerCode(id);
  }

  @Get('/distributions')
  @RequirePermissions('admin', allOf(Permissions.READ_POKER_CODES))
  @Filterable('poker-codes.distributions')
  async getUsersWithPokerCodes(): Promise<PagePaginationResponse<PokerCodeDistributionsResponseDto>> {
    const nickname = $filters.text('nickname', {
      display: 'Casino Player Nickname',
      minLen: 1,
    });

    const wallet = $filters.text('wallet', {
      display: 'Casino Player Wallet',
      minLen: 1,
    });

    const code = $filters.text('code', {
      display: 'Code',
    });

    const distributionCount = $filters.number('distributionCount', {
      display: 'Distribution Count',
    });

    const dateInterval = $filters.dateInterval('dateInterval');

    const { data, limit, page, total } = await this.pokerCodesService.getPokerCodeDistributions({
      nickname: nickname.value,
      wallet: wallet.value,
      code: code.value,
      distributionCount: distributionCount.value,
      startDate: dateInterval.value?.[0],
      endDate: dateInterval.value?.[1],
      page: $filters.pagination.page(),
      limit: $filters.pagination.limit(),
    });

    const pokerCodeDistributions = data.map((pka) => new PokerCodeDistributionsResponseDto(pka));

    return {
      data: pokerCodeDistributions,
      limit,
      page,
      total,
    };
  }

  @Get('/me')
  async getMyPokerCodes(
    @UserContext('sub') userId: string,
    @Query() filters: GetPokerCodesFiltersQuery,
  ): Promise<PagePaginationResponse<MyPokerCodeResponseDto>> {
    const userInfo = await this.userService.getUserInfo(userId);

    if (!userInfo) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    const { data, limit, page, total } = await this.pokerCodesService.getMyPokerCodes(userId, filters);

    const pokerCodes = data.map((pk) => new MyPokerCodeResponseDto(pk));

    return {
      data: pokerCodes,
      limit,
      page,
      total,
    };
  }
}
