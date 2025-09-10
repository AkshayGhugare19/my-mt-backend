import { Role } from '@modules/role/enum/role.enum';

export type SendUsersNotificationParams = {
  title: string;
  message: string;
  userIds: string[];
  url?: string;
}

export type SendRoleNotificationParams = {
  title: string;
  message: string;
  role: Role;
  url?: string;
}
