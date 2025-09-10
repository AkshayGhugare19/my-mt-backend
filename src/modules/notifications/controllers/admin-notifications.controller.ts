import { Controller, Get, Patch, Query } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { JwtPayload } from '@modules/authentication/types';
import { UserContext } from '@common/decorators/user-context.decorator';
import { PagePaginationResponse } from '@common/types';
import {
  RequirePermissions,
  allOf,
} from '@modules/permission/decorator/require-permissions.decorator';
import { NotificationDto } from '../dto/notification.dto';
import { GetUserNotificationsDto } from '../dto/get-user-notifications.dto';

@Controller('/admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions('admin', allOf())
  async getNotificationsForUser(
    @UserContext() { sub }: JwtPayload,
    @Query() params: GetUserNotificationsDto,
  ): Promise<PagePaginationResponse<NotificationDto>> {
    const { total, data } =
      await this.notificationsService.getNotificationsForUser(
        sub,
        params.page,
        params.limit,
        params.language,
      );

    return {
      data,
      page: params.page,
      total,
      limit: params.limit,
    };
  }

  @Get('/unread-count')
  @RequirePermissions('admin', allOf())
  async getUnreadNotificationsCountForUser(
    @UserContext() { sub }: JwtPayload,
  ): Promise<number> {
    return this.notificationsService.getUnreadNotificationsCountForUser(sub);
  }

  @Patch('/read')
  @RequirePermissions('admin', allOf())
  async readAll(@UserContext() { sub }: JwtPayload): Promise<void> {
    await this.notificationsService.readAllNotificationsForUser(sub);
  }
}
