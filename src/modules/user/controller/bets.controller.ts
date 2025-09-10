import { UserContext } from '@common/decorators/user-context.decorator';
import { PagePaginationQueryDto } from '@common/query/page-pagination.query';
import { PagePaginationResponse } from '@common/types';
import {
  GameBetReportAdminDto,
  SportsExchangeBetReportAdminDto,
  SportsbookBetReportAdminDto,
} from '@modules/admin/dtos/profile-reports.dto';
import { JwtPayload } from '@modules/authentication/types';
import { BetReportsService } from '@modules/bet/service/bet-reports.service';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('User Bets')
@Controller('/user/bets')
export class UserBetsController {
  constructor(private readonly betReportsService: BetReportsService) {}

  @Get('games-bets')
  async getUserGameBets(
    @UserContext() { sub: userId }: JwtPayload,
    @Query() { page, limit }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<GameBetReportAdminDto>> {
    const items = await this.betReportsService.getUserGamesBets(
      userId,
      page,
      limit,
    );

    const data = items.data.map((item) => new GameBetReportAdminDto(item));

    return {
      data,
      limit,
      page,
      total: items.count,
    };
  }

  @Get('sports-book-bets')
  async getUserSportsBookBets(
    @UserContext() { sub: userId }: JwtPayload,
    @Query() { page, limit }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<SportsbookBetReportAdminDto>> {
    const items = await this.betReportsService.getUserSportbookBets(
      userId,
      page,
      limit,
    );

    const data = items.data.map(
      (item) => new SportsbookBetReportAdminDto(item),
    );

    return {
      data,
      limit,
      page,
      total: items.count,
    };
  }

  @Get('sports-exchange-bets')
  async getUserSportsExchangeBets(
    @UserContext() { sub: userId }: JwtPayload,
    @Query() { page, limit }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<SportsExchangeBetReportAdminDto>> {
    const items = await this.betReportsService.getUserSportsExchangeBets(
      userId,
      page,
      limit,
    );

    const data = items.data.map(
      (item) => new SportsExchangeBetReportAdminDto(item),
    );

    return {
      data,
      limit,
      page,
      total: items.count,
    };
  }
}
