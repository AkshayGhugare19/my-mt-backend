import { PushSubscriptionService } from '@modules/notifications/push-subscription/service/push-subscription.service';
import { Controller, Post, Delete, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { CreatePushSubscriptionDto } from '../dto/create-push-subscription.dto';
import { JwtGuard } from '@modules/authentication/core/guards/jwt.guard';
import { UserContext } from '@common/decorators/user-context.decorator';
import { anyOf, RequirePermissions } from '@modules/permission/decorator/require-permissions.decorator';
import { SendUsersNotificationParams } from '@modules/notifications/push-subscription/types';
import { PushSubscriptionDto } from '@modules/notifications/push-subscription/dto/push-subscriptoin.dto';

@ApiTags('Push Subscription')
@Controller('/admin/push-subscriptions')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class PushSubscriptionController {
  constructor(private readonly pushSubscriptionService: PushSubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new push subscription for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Push subscription created successfully' })
  @ApiResponse({ status: 409, description: 'Subscription endpoint already exists for another user' })
  @RequirePermissions(
    'admin',
    anyOf(),
  )
  async createSubscription(
    @UserContext('sub') userId: string,
    @Body() createDto: CreatePushSubscriptionDto,
  ): Promise<any> {
    return this.pushSubscriptionService.createSubscription(userId, createDto);
  }

  @Delete('all')
  @ApiOperation({ summary: 'Remove all push subscriptions for the authenticated user' })
  @ApiResponse({ status: 200, description: 'All push subscriptions removed successfully' })
  @RequirePermissions(
    'admin',
    anyOf(),
  )
  async removeAllSubscriptions(
    @UserContext('sub') userId: string,
  ): Promise<{ message: string }> {
    return this.pushSubscriptionService.removeAllSubscriptions(userId);
  }

  @Delete(':endpoint')
  @ApiOperation({ summary: 'Remove a push subscription for the authenticated user' })
  @ApiParam({ name: 'endpoint', description: 'URL encoded endpoint to remove' })
  @ApiResponse({ status: 200, description: 'Push subscription removed successfully' })
  @ApiResponse({ status: 404, description: 'Push subscription not found' })
  @RequirePermissions(
    'admin',
    anyOf(),
  )
  async removeSubscription(
    @UserContext('sub') userId: string,
    @Param('endpoint') endpoint: string,
  ): Promise<{ message: string }> {
    const decodedEndpoint = decodeURIComponent(endpoint);
    return this.pushSubscriptionService.removeSubscription(userId, decodedEndpoint);
  }

  @Get('')
  @ApiOperation({ summary: 'Get all push subscriptions for the authenticated user' })
  @ApiResponse({ status: 200, description: 'User push subscriptions retrieved successfully' })
  @RequirePermissions(
    'admin',
    anyOf(),
  )
  async getUserSubscriptions(@UserContext('sub') userId: string): Promise<PushSubscriptionDto[]> {
    const subscriptions = await this.pushSubscriptionService.getUserSubscriptions(userId);
    return subscriptions.map(PushSubscriptionDto.from);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all active push subscriptions (admin only)' })
  @ApiResponse({ status: 200, description: 'All push subscriptions retrieved successfully' })
  @RequirePermissions(
    'admin',
    anyOf(),
  )
  async getAllSubscriptions(): Promise<PushSubscriptionDto[]> {
    const subscriptions = await this.pushSubscriptionService.getAllSubscriptions();
    return subscriptions.map(PushSubscriptionDto.from);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get push subscription statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Push subscription stats retrieved successfully' })
  @RequirePermissions(
    'admin',
    anyOf(),
  )
  async getSubscriptionStats(): Promise<{ total: number; active: number; inactive: number }> {
    return this.pushSubscriptionService.getSubscriptionStats();
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test notification to the authenticated user' })
  @ApiResponse({ status: 200, description: 'Test notification sent successfully' })
  @RequirePermissions(
    'admin',
    anyOf(),
  )
  async sendTestNotification(@UserContext('sub') userId: string): Promise<any> {
    const testDto: SendUsersNotificationParams = {
      title: 'Test Notification',
      message: 'This is a test push notification from Royal Stakes!',
      userIds: [userId],
    };
    return this.pushSubscriptionService.sendNotification(testDto);
  }
}
