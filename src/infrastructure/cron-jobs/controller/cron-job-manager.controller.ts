import { PartnerMatrixApi } from '@external/partner-matrix/api';
import { PartnerMatrixCron } from '@infrastructure/cron-jobs/producer/partner-matrix.cron';
import { allOf, RequirePermissions } from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Cron Job Manager')
@Controller('admin/cron/manager')
export class CronJobManagerController {
  constructor(
    private readonly partnerMatrixCron: PartnerMatrixCron,
    private readonly partnerMatrixApi: PartnerMatrixApi,
  ) {}

  // #region Partner Matrix
  @Post('partner-matrix/events/retry')
  @RequirePermissions('admin', allOf(Permissions.EDIT_PERMISSIONS))
  async retryPartnerMatrixEvents(): Promise<{ success: boolean }> {
    await this.partnerMatrixCron.retryFailedTransactions();
    return {
      success: true,
    };
  }

  @Post('partner-matrix/events/push')
  @RequirePermissions('admin', allOf(Permissions.EDIT_PERMISSIONS))
  async pushPartnerMatrixEvents(): Promise<{ success: boolean }> {
    await this.partnerMatrixCron.pushData();
    return {
      success: true,
    };
  }

  @Get('partner-matrix/user/info/:id')
  @RequirePermissions('admin', allOf(Permissions.EDIT_PERMISSIONS))
  async getPmUserInfo(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return await this.partnerMatrixApi.getPlayerData(id);
  }
  // #endregion
}
