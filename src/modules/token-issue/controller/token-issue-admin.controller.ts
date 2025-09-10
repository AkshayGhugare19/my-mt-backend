import { UserContext } from '@common/decorators/user-context.decorator';
// import { PagePaginationQueryDto } from '@common/query/page-pagination.query';
import { PagePaginationResponse } from '@common/types';
import { JwtPayload } from '@modules/authentication/types';
import { CreateMasterTokenIssueDto } from '@modules/token-issue/dto/create-master-token-issue.dto';
import { TokenIssueAdminDto } from '@modules/token-issue/dto/token-issue-admin.dto';
import { ResolveTokenIssueQuery } from '@modules/token-issue/query/resolve-request.query';
import { TokenIssueService } from '@modules/token-issue/service/token-issue.service';
import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { decimalToNumber } from '@utils/decimal-do-number';
import {
  RequirePermissions,
  anyOf,
} from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { AcceptTokenIssueDto } from '@modules/token-issue/dto/accept-token-issue.dto';
import { RequestTokenIssueDto } from '@modules/token-issue/dto/request-token-issue.dto';
import { TokenIssueDto } from '@modules/token-issue/dto/token-issue.dto';
import { ApiFilterQueryType, Filterable } from '@meta/filters/decorator';
import { $filters } from '@meta/filters';
import { usdtToPoints } from '@utils/usdt-to-points';

@Controller('/admin/tokens')
export class TokenIssueAdminController {
  constructor(private readonly tokenIssueService: TokenIssueService) {}

  @Get('issues')
  @RequirePermissions('admin', anyOf(Permissions.READ_TOKEN_REQUESTS))
  @ApiFilterQueryType('topups')
  @Filterable('topups')
  async getAllTokenIssues(
    @UserContext() { sub }: JwtPayload,
    // @Query() { limit, page }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<TokenIssueAdminDto>> {
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
      ([min, max]) =>
        [usdtToPoints(min), usdtToPoints(max)] as [number, number],
    );
    const requests = await this.tokenIssueService.getAllTokenIssuesMaster({
      filters: {
        search: search.value,
        startDate: date.value?.[0],
        endDate: date.value?.[1],
        amountMin: amount?.[0],
        amountMax: amount?.[1],
        page: $filters.pagination.page(),
        limit: $filters.pagination.limit(),
      },
      masterId: sub,
    });

    return {
      data: requests.data.map(
        (request) =>
          new TokenIssueAdminDto({
            amount: decimalToNumber(request.amount),
            createdAt: request.createdAt,
            id: request.id,
            status: request.status,
            updatedAt: request.updatedAt,
            paymentType: (request.paymentType as 'cash' | 'usdt') || undefined,
            prepaid: request.prepaidPercent || undefined,
            proof: request.proof || undefined,
            targetEmail: request.requester.email!,
            masterEmail: request.master.email!,
            masterNickname: request.master.nickname!,
            targetNickname: request.requester.nickname!,
            userBookieStake:
              decimalToNumber(request.requester.userBookieStake) || 0,
            flexibleBookieStake: decimalToNumber(
              request.requester.flexibleBookieStake,
            ),
            predefinedBookieStake: decimalToNumber(
              request.requester.predefinedBookieStake,
            ),
          }),
      ),
      limit: requests.limit,
      page: requests.page,
      total: requests.total,
    };
  }

  @Post('issues')
  @RequirePermissions(
    'admin',
    anyOf(
      Permissions.CREATE_TOKEN_REQUESTS_VIP,
      Permissions.CREATE_TOKEN_REQUESTS_MASTER,
    ),
  )
  async issueTokens(
    @UserContext() { sub }: JwtPayload,
    @Body() createTokenIssueDto: CreateMasterTokenIssueDto,
  ): Promise<TokenIssueAdminDto> {
    const tokenIssue = await this.tokenIssueService.lockAndCreateTokenIssue({
      target: createTokenIssueDto.targetId,
      issuer: sub,
      createTokenIssueDto,
    });
    return TokenIssueAdminDto.from(tokenIssue);
  }

  @Post('issues/own')
  @RequirePermissions(
    'admin',
    anyOf(Permissions.CREATE_TOKEN_REQUESTS_MASTER_OWN),
  )
  async createTokenRequestMaster(
    @UserContext() { sub }: JwtPayload,
    @Body() requestTokenIssueDto: RequestTokenIssueDto,
  ): Promise<TokenIssueDto> {
    const tokenIssue =
      await this.tokenIssueService.lockAndCreateTokenIssueRequest({
        amount: requestTokenIssueDto.amount,
        userId: sub,
      });
    return TokenIssueDto.from(tokenIssue);
  }

  @Patch('issues/accept')
  @RequirePermissions(
    'admin',
    anyOf(
      Permissions.EDIT_TOKEN_REQUESTS_MASTER,
      Permissions.EDIT_TOKEN_REQUESTS_VIP,
    ),
  )
  async acceptTokensIssue(
    @UserContext() { sub }: JwtPayload,
    @Body() acceptTokenIssue: AcceptTokenIssueDto,
  ): Promise<TokenIssueAdminDto> {
    const tokenIssue =
      await this.tokenIssueService.lockAndApproveTokenIssueRequest({
        masterId: sub,
        requestId: acceptTokenIssue.tokenIssueId,
        prepaidPercent: acceptTokenIssue.prepaid,
        paymentType: acceptTokenIssue.paymentType,
        proof: acceptTokenIssue.proof,
      });
    return TokenIssueAdminDto.from(tokenIssue);
  }

  @Patch('issues/reject')
  @RequirePermissions(
    'admin',
    anyOf(
      Permissions.EDIT_TOKEN_REQUESTS_MASTER,
      Permissions.EDIT_TOKEN_REQUESTS_VIP,
    ),
  )
  async rejectTokensIssue(
    @UserContext() { sub }: JwtPayload,
    @Query() { tokenIssueId }: ResolveTokenIssueQuery,
  ): Promise<TokenIssueAdminDto> {
    const tokenIssue =
      await this.tokenIssueService.lockAndRejectTokenIssueRequest({
        masterId: sub,
        requestId: tokenIssueId,
      });
    return TokenIssueAdminDto.from(tokenIssue);
  }
}
