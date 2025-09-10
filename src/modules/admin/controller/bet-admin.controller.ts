import { UserContext } from '@common/decorators/user-context.decorator';
import { GenericExtendedBetDetailsDto } from '@modules/admin/dtos/generic-extended-bet-details.dto';
import { SportsbookExtendedBetDetailsDto } from '@modules/admin/dtos/sportsbook-extended-bet-details.dto';
import { BetReportsService } from '@modules/bet/service/bet-reports.service';
import {
  RequirePermissions,
  anyOf,
} from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Admin Bets')
@Controller('/admin/bets')
export class BetAdminController {
  constructor(
    private readonly betReportsService: BetReportsService,
  ) {}

  @Get(':id/events')
  @RequirePermissions(
    'admin',
    anyOf(
      Permissions.READ_USER_DETAILS,
      Permissions.READ_VIP_DETAILS,
      Permissions.READ_VIP_OWN,
    ),
  )
  async getExtendedBetDetails(
    @Param('id') betId: string,
    @UserContext('sub') userId: string,
  ): Promise<SportsbookExtendedBetDetailsDto | GenericExtendedBetDetailsDto> {
    const data = await this.betReportsService.getBetEvent(betId, userId);

    if (data.type === 'sportsbook') {
      return SportsbookExtendedBetDetailsDto.from(data);
    }

    return GenericExtendedBetDetailsDto.from(data);
  }
}
