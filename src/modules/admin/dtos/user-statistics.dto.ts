/* eslint-disable sonarjs/cognitive-complexity */
import { UserWithStatistics } from '@modules/admin/types';
import { UserSchema } from '@modules/user/dto/user.dto';
import { decimalToNumber } from '@utils/decimal-do-number';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { AvatarImage } from '@modules/media/decorator/avatar-image.decorator';

export const UserStatisticsSchema = UserSchema.omit({
  resetPasswordRequired: true,
  enable2FA: true,
  blockchain: true,
}).extend({
  balance: z.number(),
  debt: z.number(),
  masterId: z.string().nullable(),
  blockedAt: z.date().nullable(),
  biggestLoss: z.number(),
  biggestWin: z.number(),
  totalDeposit: z.number().nullable(),
  totalIssuedTo: z.number().nullable(),
  totalSettled: z.number().nullable(),
  totalLoss: z.number(),
  totalWin: z.number(),
  totalWithdraw: z.number(),
  volumePlayed: z.number(),
  maxBetSize: z.number().nullable(),
  userBookieStake: z.number(),
  masterNickname: z.string().nullable(),
  pnl: z.number(),
  favoriteGames: z.array(z.string()),
  favoriteCategory: z.string(),
  bonusBalance: z.number().optional(),
  isBonusEnabled: z.boolean().optional(),
  rank: z.string().nullable(),
  partnerMatrixBtag: z.string().nullable(),
});

@AvatarImage()
export class UserStatisticsAdminDto extends createZodDto(UserStatisticsSchema) {
  constructor(data: UserStatisticsAdminDto) {
    super();
    Object.assign(this, data);
  }

  static fromUserStatistics(
    userStatistics: UserWithStatistics,
  ): UserStatisticsAdminDto {
    return new UserStatisticsAdminDto({
      hasPassword: false,
      playerTag: userStatistics.playerTag,
      createdAt: userStatistics.createdAt,
      balance: decimalToNumber(userStatistics?.balance?.balance) || 0,
      debt: decimalToNumber(userStatistics?.balance?.debt) || 0,
      biggestLoss: decimalToNumber(userStatistics?.balance?.biggestLoss) || 0,
      biggestWin: decimalToNumber(userStatistics?.balance?.biggestWin) || 0,
      blockedAt: userStatistics.blockedAt,
      email: userStatistics.email || userStatistics.web3AuthEmail,
      id: userStatistics.id,
      masterId: userStatistics.masterId,
      masterNickname: userStatistics.master?.nickname || null,
      avatar: userStatistics.avatar,
      role: userStatistics.roles.at(0)?.name as string,
      totalDeposit:
        decimalToNumber(userStatistics?.balance?.totalDeposit) ||
        decimalToNumber(userStatistics?.balance?.totalIssuedTo) ||
        0,
      totalIssuedTo:
        decimalToNumber(userStatistics?.balance?.totalIssuedTo) || 0,
      totalSettled: decimalToNumber(userStatistics?.balance?.totalSettled) || 0,
      totalLoss: decimalToNumber(userStatistics?.balance?.totalLoss) || 0,
      totalWin: decimalToNumber(userStatistics?.balance?.totalWin) || 0,
      maxBetSize: decimalToNumber(userStatistics?.maxBetSize) || 0,
      totalWithdraw:
        decimalToNumber(userStatistics?.balance?.totalSettled) ||
        decimalToNumber(userStatistics?.balance?.totalWithdraw) ||
        0,
      volumePlayed: decimalToNumber(userStatistics?.balance?.volumePlayed) || 0,
      wallet: userStatistics.wallet,
      userBookieStake: decimalToNumber(userStatistics.userBookieStake),
      canWithdraw: userStatistics.canWithdraw,
      pnl:
        decimalToNumber(
          userStatistics?.balance?.totalWin?.sub(
            userStatistics?.balance?.totalLoss,
          ),
        ) || 0,
      nickname: userStatistics.nickname,
      favoriteGames: userStatistics.favoriteGames.map((game) => game.name),
      favoriteCategory: userStatistics.favoriteCategory,
      bonusBalance: decimalToNumber(userStatistics.bonusBalance),
      isBonusEnabled: userStatistics.isBonusEnabled || false,
      rank: userStatistics.rank,
      partnerMatrixBtag: userStatistics.partnerMatrixBtag || null,
    });
  }
}
