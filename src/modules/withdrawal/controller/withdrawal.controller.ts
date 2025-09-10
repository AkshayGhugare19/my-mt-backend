import { ForRoles } from '@common/decorators/for-roles.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { Roles } from '@modules/role/enum/role.enum';
import { JwtPayload } from '@modules/authentication/types';
import { WithdrawalService } from '@modules/withdrawal/service/withdrawal.service';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AvailableWithdrawDto } from '../dto/available-withdraw.response.dto';
import { CreateWithdrawalDto } from '../dto/create-withdrawal.dto';
import { CreateWithdrawalResponseDto } from '../dto/create-withdrawal.response.dto';
import {
  UserWithdrawalDto,
  UserWithdrawalsResponseDto,
} from '../dto/user-withdrawals.response.dto';
import { GetUserWithdrawalRequestsFilteredQuery } from '@modules/withdrawal/query/get-user-withdrawals-filtered.query';
import { PagePaginationResponse } from '@common/types';
import { BalanceService } from '@modules/balance/service/balance.service';
import { decimalToDollarsValue } from '@utils/decimal-to-dollar-value';

@Controller('withdrawals')
export class WithdrawalController {
  constructor(
    private readonly withdrawalService: WithdrawalService,
    private readonly balanceService: BalanceService,
  ) {}

  @Get('/available-amount')
  @ForRoles([Roles.USER])
  async getWithdrawableAmount(
    @UserContext() { sub }: JwtPayload,
  ): Promise<AvailableWithdrawDto> {
    const withdrawableBalance = await this.balanceService.getWithdrawableBalance(sub);
    return {
      amount: await this.withdrawalService.getUserWithdrawalTotal({
        userId: sub,
      }),
      availableAmount: decimalToDollarsValue(withdrawableBalance.balance),
    };
  }

  @Post('/new')
  @ForRoles([Roles.USER])
  async createWithdrawRequest(
    @UserContext() { sub }: JwtPayload,
    @Body() { amount, currency, wallet }: CreateWithdrawalDto,
  ): Promise<CreateWithdrawalResponseDto> {
    return CreateWithdrawalResponseDto.fromWithdrawalRequest(
      await this.withdrawalService.lockAndCreateWithdrawRequest({
        userId: sub,
        amount,
        currency,
        wallet,
      }),
    );
  }

  @Get('/own')
  @ForRoles([Roles.USER])
  async getUsersWithdrawalRequests(
    @UserContext() { sub }: JwtPayload,
    @Query() filters: GetUserWithdrawalRequestsFilteredQuery,
  ): Promise<PagePaginationResponse<UserWithdrawalDto>> {
    const withdrawals = await this.withdrawalService.getAllUsersRequests({
      userId: sub,
      filters,
    });
    return {
      data: UserWithdrawalsResponseDto.fromWithdrawalRequests(withdrawals.data),
      limit: filters.limit,
      page: filters.page,
      total: withdrawals.total,
    };
  }
}
