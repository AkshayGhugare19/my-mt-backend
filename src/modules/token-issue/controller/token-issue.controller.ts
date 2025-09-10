import { ForRoles } from '@common/decorators/for-roles.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { Roles } from '@modules/role/enum/role.enum';
import { PagePaginationResponse } from '@common/types';
import { JwtPayload } from '@modules/authentication/types';
import { RequestTokenIssueDto } from '@modules/token-issue/dto/request-token-issue.dto';
import { TokenIssueDto } from '@modules/token-issue/dto/token-issue.dto';
import { UserTokenIssueFilterQuery } from '@modules/token-issue/query/user-token-issue-filter.query';
import { TokenIssueService } from '@modules/token-issue/service/token-issue.service';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { decimalToNumber } from '@utils/decimal-do-number';

@Controller('tokens')
export class TokenIssueController {
  constructor(private readonly tokenIssueService: TokenIssueService) {}

  @Post('requests')
  @ForRoles([Roles.VIP_USER])
  async requestTokens(
    @UserContext() { sub }: JwtPayload,
    @Body() requestTokenIssue: RequestTokenIssueDto,
  ): Promise<TokenIssueDto> {
    const tokenIssue =
      await this.tokenIssueService.lockAndCreateTokenIssueRequest({
        userId: sub,
        amount: requestTokenIssue.amount,
      });
    return TokenIssueDto.from(tokenIssue);
  }

  @Get('requests')
  @ForRoles([Roles.VIP_USER])
  async getAllTokenRequests(
    @UserContext() { sub }: JwtPayload,
    @Query() query: UserTokenIssueFilterQuery,
  ): Promise<PagePaginationResponse<TokenIssueDto>> {
    const tokenIssues = await this.tokenIssueService.getAllTokenRequests(
      {
        filter: {
          requesterId: sub,
        },
        ...query,
      }
    );
    return {
      limit: tokenIssues.limit,
      page: tokenIssues.page,
      total: tokenIssues.total,
      data: tokenIssues.data.map(
        (tokenIssue) =>
          new TokenIssueDto({
            amount: decimalToNumber(tokenIssue.amount) || 0,
            createdAt: tokenIssue.createdAt,
            id: tokenIssue.id,
            status: tokenIssue.status,
            updatedAt: tokenIssue.updatedAt,
          }),
      ),
    };
  }
}
