import { UserContext } from '@common/decorators/user-context.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { $filters } from '@meta/filters';
import { ApiFilterQueryType, Filterable } from '@meta/filters/decorator';
import { JwtPayload } from '@modules/authentication/types';
import {
  RequirePermissions,
  allOf,
  anyOf,
} from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { CloseWithdrawalDto } from '@modules/withdrawal/dto/close-withdrawal.dto';
import { WithdrawalsResponseDto } from '@modules/withdrawal/dto/withdrawals.response.dto';
import { AcceptWithdrawalQuery } from '@modules/withdrawal/query/accept-request.query';
// import { GetAllWithdrawalRequestsFilteredQuery } from '@modules/withdrawal/query/get-all-withdrawals-filtered.query';
import { RejectWithdrawalQuery } from '@modules/withdrawal/query/reject-request.query';
import { WithdrawalService } from '@modules/withdrawal/service/withdrawal.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Withdrawals Admin')
@Controller('admin/withdrawals')
export class WithdrawalAdminController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get('/')
  @ApiFilterQueryType('withdrawals')
  @RequirePermissions('admin', allOf(Permissions.READ_WITHDRAWAL))
  @Filterable('withdrawals')
  async getAllWithdrawalRequests(
    // @Query() filteredQuery: GetAllWithdrawalRequestsFilteredQuery,
    @UserContext() { sub }: JwtPayload,
  ): Promise<WithdrawalsResponseDto> {
    const search = $filters.text('userSearch', {
      lowercase: true,
      minLen: 3,
    });
    const date = $filters.dateInterval('date');
    const amountUSDT = $filters.range('amountUSDT', {
      display: 'Amount (USDT)',
      min: 0,
    });

    const amount = amountUSDT.map(
      ([min, max]) => [min, max] as [number, number],
    );

    const includePending = $filters.boolean('pending', {
      display: 'Include pending withdrawals',
      default: true,
    });

    const count = await this.withdrawalService.getAllRequestCount({
      filters: {
        search: search.value,
        startDate: date.value?.[0],
        endDate: date.value?.[1],
        amountMin: amount?.[0],
        amountMax: amount?.[1],
        status: includePending
          ? undefined
          : ['ACCEPTED', 'AUTO_ACCEPTED', 'FAILED', 'FULFILLED', 'REJECTED'], // all excluding pending
        page: 0,
        limit: 0,
      },
    });

    const result = await this.withdrawalService.getAllRequests({
      filters: {
        search: search.value,
        startDate: date.value?.[0],
        endDate: date.value?.[1],
        amountMin: amount?.[0],
        amountMax: amount?.[1],
        status: includePending
          ? undefined
          : ['ACCEPTED', 'AUTO_ACCEPTED', 'FAILED', 'FULFILLED', 'REJECTED'], // all excluding pending
        page: $filters.pagination.page(),
        limit: $filters.pagination.limit(),
      },
      requesterId: sub,
    });

    return WithdrawalsResponseDto.fromWithdrawalRequests({
      withdrawalRequests: result,
      limit: $filters.pagination.limit(),
      page: $filters.pagination.page(),
      total: count,
    });
  }

  @HttpCode(204)
  @Patch('/accept')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_WITHDRAWAL))
  async acceptUserWithdrawalRequest(
    @UserContext() { sub }: JwtPayload,
    @Query() { withdrawalId }: AcceptWithdrawalQuery,
  ): Promise<void> {
    const withdrawal = await this.withdrawalService.lockAndAcceptRequest({
      withdrawalId,
      accepterId: sub,
    });

    if (!withdrawal) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND);
    }
  }

  @HttpCode(204)
  @Patch('/proof')
  @RequirePermissions('admin', anyOf(Permissions.CLOSE_WITHDRAWAL))
  async closeUserWithdrawalRequest(
    @UserContext() { sub }: JwtPayload,
    @Body() { withdrawalId, proof }: CloseWithdrawalDto,
  ): Promise<void> {
    const withdrawal = await this.withdrawalService.lockAndCloseRequest({
      withdrawalId,
      closerId: sub,
      proof,
    });

    if (!withdrawal) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND);
    }
  }

  @HttpCode(204)
  @Patch('/reject')
  @RequirePermissions(
    'admin',
    anyOf(Permissions.EDIT_WITHDRAWAL, Permissions.CLOSE_WITHDRAWAL),
  )
  async rejectUserWithdrawalRequest(
    @Query() { withdrawalId }: RejectWithdrawalQuery,
    @UserContext() { sub }: JwtPayload,
  ): Promise<void> {
    const withdrawal = await this.withdrawalService.lockAndRejectRequest({
      withdrawalId,
      rejecterId: sub,
    });

    if (!withdrawal) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND);
    }
  }
}
