import { Body, Controller, Post } from '@nestjs/common';
import { ChannelAuthResponse, RealtimeService } from './realtime.service';
import { UserContext } from '@common/decorators/user-context.decorator';
import { JwtPayload } from '@modules/authentication/types';
import { ChannelAuthorizationDto } from './dto/channel-authorization.dto';
import {
  RequirePermissions,
  allOf,
} from '@modules/permission/decorator/require-permissions.decorator';

@Controller('/realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Post('/channel-auth')
  channelAuthorization(
    @UserContext() { sub }: JwtPayload,
    @Body() body: ChannelAuthorizationDto,
  ): Promise<ChannelAuthResponse> {
    return this.realtimeService.authorizeChannel(
      sub,
      body.socketId,
      body.channelName,
    );
  }

  @Post('/admin/channel-auth')
  @RequirePermissions('admin', allOf())
  adminChannelAuthorization(
    @UserContext() jwt: JwtPayload,
    @Body() body: ChannelAuthorizationDto,
  ): Promise<ChannelAuthResponse> {
    return this.channelAuthorization(jwt, body);
  }
}
