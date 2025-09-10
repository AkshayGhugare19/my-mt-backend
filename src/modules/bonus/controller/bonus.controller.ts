import { ConfigService } from '@nestjs/config';
import { ForRoles } from '@common/decorators/for-roles.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { PagePaginationQueryDto } from '@common/query/page-pagination.query';
import { PagePaginationResponse } from '@common/types';
import { BonusBalanceService } from '@modules/bonus/service/bonus-balance.service';
import { BonusProgressionService } from '@modules/bonus/service/bonus-progression.service';
import { Roles } from '@modules/role/enum/role.enum';
import {
  Controller,
  Get,
  NotImplementedException,
  Query,
} from '@nestjs/common';
import { ENV } from '@common/env';
import { BonusProgressionDto } from '@modules/bonus/dtos/bonus-progression.dto';
import { BonusBalanceDto } from '@modules/bonus/dtos/bonus-balance.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Bonus')
@Controller('bonuses')
export class BonusController {
  constructor(
    private readonly bonusProgressService: BonusProgressionService,
    private readonly bonusBalanceService: BonusBalanceService,
    private readonly configService: ConfigService,
  ) {}

  @Get('users/progress')
  @ForRoles([Roles.USER, Roles.VIP_USER])
  async listUserProgress(
    @UserContext('sub') userId: string,
    @Query() paginationQuery: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<BonusProgressionDto>> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    const data = await this.bonusProgressService.getAll(
      paginationQuery,
      {
        userId,
      },
      true,
    );
    return {
      data: data.data.map((progression) =>
        BonusProgressionDto.from(progression),
      ),
      limit: data.limit,
      page: data.page,
      total: data.total,
    };
  }

  @Get('users/balance')
  @ForRoles([Roles.USER, Roles.VIP_USER])
  async listUserBalance(
    @UserContext('sub') userId: string,
    @Query() paginationQuery: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<BonusBalanceDto>> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    const data = await this.bonusBalanceService.getAll(paginationQuery, {
      userId,
    });
    return {
      data: data.data.map((progression) => BonusBalanceDto.from(progression)),
      limit: data.limit,
      page: data.page,
      total: data.total,
    };
  }
}
