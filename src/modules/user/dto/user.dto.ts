import { UserWithBalance } from '@modules/user/types';
import { decimalToNumber } from '@utils/decimal-do-number';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';
import { AvatarImage } from '@modules/media/decorator/avatar-image.decorator';

export const UserSchema = extendApi(
  z.object({
    createdAt: z.coerce.date(),
    id: z.string(),
    email: z.string().nullable(),
    enable2FA: z.boolean(),
    avatar: z.string().nullable().default(null),
    wallet: z.string().nullable(),
    nickname: z.string().nullable(),
    playerTag: z.string().nullable(),
    resetPasswordRequired: z.boolean().nullable(),
    canWithdraw: z.boolean(),
    role: z.string(),
    balance: z.number().nullable(),
    debt: z.number().nullable(),
    blockchain: z.number().nullable(),
    hasPassword: z.boolean(),
  }),
);

@AvatarImage()
export class UserDto extends createZodDto(UserSchema) {
  constructor(data?: Partial<UserDto>) {
    super();
    if (!data) return;
    Object.assign(this, data);
  }

  static fromUser(user: Partial<UserWithBalance>): UserDto {
    return new UserDto({
      id: user.id,
      email: user.email,
      enable2FA: user.enable2FA,
      nickname: user.nickname,
      role: user.roles?.at(0)?.name,
      avatar: user.avatar ?? null,
      wallet: user.wallet,
      resetPasswordRequired: user.resetPasswordRequired,
      canWithdraw: user.canWithdraw,
      playerTag: user.playerTag,
      balance: decimalToNumber(user.balance?.balance),
      debt: decimalToNumber(user.balance?.debt),
      blockchain: user.blockchain,
      hasPassword: user.hasPassword,
    });
  }
}
