import { UserDto, UserSchema } from '@modules/user/dto/user.dto';
import { UserWithBalance } from '@modules/user/types';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { decimalToDollarsValue } from '@utils/decimal-to-dollar-value';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { extendApi } from '@anatine/zod-openapi';

export const UserStatisticsSchema = extendApi(
  UserSchema.extend({
    balance: z.number(),
    hasPassword: z.boolean(),
    debt: z.number(),
    biggestLoss: z.number(),
    biggestWin: z.number(),
    totalDeposit: z.number().nullable(),
    totalIssuedTo: z.number().nullable(),
    totalSettled: z.number().nullable(),
    totalLoss: z.number(),
    totalWin: z.number(),
    totalWithdraw: z.number(),
    volumePlayed: z.number(),
    nonPlayableBalance: z.number().optional(),
    createdAt: z.date(),
    pnl: z.number(),
    favoriteGames: z.array(z.string()),
    favoriteCategory: z.string(),
    level: z.number(),
    rank: z.string(),
    totalRake: z.number(),
    isBonusEnabled: z.boolean(),
    signUpEventSent: z.boolean(),
    preference: z.object({
      language: z.string().nullable(),
      exchangeWidgetPair: z.string().nullable(),
    }),
  }),
);

export class UserStatisticsDto extends createZodDto(UserStatisticsSchema) {
  constructor(data?: Partial<UserStatisticsDto>) {
    super();
    if (!data) return;
    Object.assign(this, data);
  }

  static fromUser(user: Partial<UserWithBalance>): UserStatisticsDto {
    const userDto = UserDto.fromUser(user);
    return new UserStatisticsDto({
      ...userDto,
      balance: decimalToNumber(user.balance?.balance || new Decimal(0)),
      debt: decimalToNumber(user.balance?.debt || new Decimal(0)),
      biggestLoss: decimalToDollarsValue(
        user.balance?.biggestLoss || new Decimal(0),
      ),
      biggestWin: decimalToDollarsValue(user.balance?.biggestWin),
      createdAt: user.createdAt,
      totalDeposit: decimalToDollarsValue(user.balance?.totalDeposit),
      totalIssuedTo: decimalToDollarsValue(user.balance?.totalIssuedTo),
      totalSettled: decimalToDollarsValue(user.balance?.totalSettled),
      totalLoss: decimalToDollarsValue(user.balance?.totalLoss),
      totalWin: decimalToDollarsValue(user.balance?.totalWin),
      totalWithdraw: decimalToDollarsValue(user.balance?.totalWithdraw),
      volumePlayed: decimalToDollarsValue(user.balance?.volumePlayed),
      nonPlayableBalance: decimalToDollarsValue(user.nonPlayableBalance),
      pnl: decimalToDollarsValue(
        user.balance?.totalWin?.sub(user.balance?.volumePlayed),
      ),
      favoriteGames: user.favoriteGames?.map((game) => game.name),
      favoriteCategory: user.favoriteCategory,
      rank: user.rank,
      level: user.level,
      totalRake: user.totalRake,
      isBonusEnabled: user.isBonusEnabled ?? true,
      signUpEventSent: user.signUpEventSent,
      preference: user?.preference,
    });
  }
}
