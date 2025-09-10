import { ForRoles } from '@common/decorators/for-roles.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { Roles } from '@modules/role/enum/role.enum';
import { PagePaginationResponse } from '@common/types';
import { JwtPayload } from '@modules/authentication/types';
import { CreateTokenSettlementRequestDto } from '@modules/token-settlement/dto/create-token-settlement-request.dto';
import { TokenSettlementDto } from '@modules/token-settlement/dto/token-settlement.dto';
import { UserTokenSettlementFilterQuery } from '@modules/token-settlement/query/user-token-settlement-filter.query';
import { TokenSettlementService } from '@modules/token-settlement/service/token-settlement.service';
import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import { decimalToNumber } from '@utils/decimal-do-number';

@Controller('token-settlements')
export class TokenSettlementController {
  private readonly logger = new Logger(TokenSettlementController.name);

  constructor(
    private readonly tokenSettlementService: TokenSettlementService,
  ) {}

  @Get('')
  async getAll(
    @UserContext() { sub }: JwtPayload,
    @Query() query: UserTokenSettlementFilterQuery,
  ): Promise<PagePaginationResponse<TokenSettlementDto>> {
    const requests = await this.tokenSettlementService.getOwnSettlementRequests(
      sub,
      query,
    );

    return {
      data: requests.data.map(
        (request) =>
          new TokenSettlementDto({
            settleAmount: decimalToNumber(request.settleAmount),
            amount: decimalToNumber(request.amount),
            createdAt: request.createdAt,
            id: request.id,
            status: request.status,
            updatedAt: request.updatedAt,
          }),
      ),
      limit: requests.limit,
      page: requests.page,
      total: requests.total,
    };
  }

  @Post('')
  @ForRoles([Roles.VIP_USER])
  async cerate(
    @UserContext() { sub }: JwtPayload,
    @Body() createTokenSettlementRequestDto: CreateTokenSettlementRequestDto,
  ): Promise<TokenSettlementDto> {
    const createdRequest =
      await this.tokenSettlementService.lockAndCreateTokenSettlement({
        userId: sub,
        amount: createTokenSettlementRequestDto.amount,
      });

    return new TokenSettlementDto({
      amount: decimalToNumber(createdRequest.amount),
      createdAt: createdRequest.createdAt,
      id: createdRequest.id,
      settleAmount: decimalToNumber(createdRequest.settleAmount),
      status: createdRequest.status,
      updatedAt: createdRequest.updatedAt,
    });
  }
}
