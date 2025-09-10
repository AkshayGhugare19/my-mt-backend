import { ErrorMessages } from '@common/enums/error-messages.enum';
import { Role } from '@modules/role/enum/role.enum';
import { UserService } from '@modules/user/services/user.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PusherService } from 'nestjs-pusher';
import type { ChannelAuthResponse } from 'pusher';

export { ChannelAuthResponse };

// --begin typemap--
export interface UserNotificationMessage {
  type: 'notification';
  id: string;
}

export interface BalanceUpdateMessage {
  type: 'balance';
  newAmount: number;
}

export interface DepositMessage {
  type: 'deposit';
  amount: number;
  currency: number;
  blockchain: number;
}

export interface LogoutMessage {
  type: 'logout';
}

export interface GroupNotificationMessage {
  type: 'notification';
}

// union of all messages sent to users privately
export type PrivateMessage =
  | UserNotificationMessage
  | BalanceUpdateMessage
  | LogoutMessage
  | DepositMessage;

// unon of all maessages sent to all roles
type AllRolesMessage = GroupNotificationMessage;

type RoleMessageMap<T extends Partial<Record<Role, any>>> = T;

type RoleOnlyMessage = RoleMessageMap<{
  VIP: GroupNotificationMessage;
}>;

export type RoleMessage<T extends keyof RoleOnlyMessage> =
  | RoleOnlyMessage[T]
  | AllRolesMessage;
// --end typemap--

function privateUserChannel(userId: string): string {
  return `private-royalstakes-user-${userId}`;
}

function privateRoleChannel(roleName: string): string {
  return `private-royalstakes-role-${roleName}`;
}

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  constructor(
    private readonly pusherService: PusherService,
    private readonly userService: UserService,
  ) {}

  async pushMessageToUser(
    userId: string,
    message: PrivateMessage,
  ): Promise<void> {
    await this.pusherService
      .trigger(privateUserChannel(userId), 'message', message)
      .catch((error) => {
        this.logger.error({
          error: error.message,
          stack: error.stack,
        });
      });
  }

  async pushMessageToRole<T extends Role>(
    role: T,
    message: T extends keyof RoleOnlyMessage ? RoleMessage<T> : AllRolesMessage,
  ): Promise<void> {
    await this.pusherService
      .trigger(privateRoleChannel(role.toLowerCase()), 'message', message)
      .catch((error) => {
        this.logger.error({
          error: error.message,
          stack: error.stack,
        });
      });
  }

  async authorizeChannel(
    userId: string,
    socketId: string,
    channelName: string,
  ): Promise<ChannelAuthResponse> {
    const user = await this.userService.getUserInfo(userId);
    if (!user) {
      throw new BadRequestException(ErrorMessages.USER_NOT_FOUND);
    }

    const roles = user.roles.map((x) => x.name.toLowerCase());

    const allowedChannels = [
      privateUserChannel(userId),
      ...roles.map(privateRoleChannel),
    ];

    if (!allowedChannels.includes(channelName)) {
      throw new ForbiddenException(ErrorMessages.UNAUTHORIZED_ACTION);
    }

    return this.pusherService.authorizeChannel(socketId, channelName);
  }
}
