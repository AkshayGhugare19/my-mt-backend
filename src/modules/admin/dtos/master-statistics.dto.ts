import { MasterUserWithStatistics } from '@modules/admin/types';
import { decimalToNumber } from '@utils/decimal-do-number';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const MasterStatisticsSchema = z.object({
  createdAt: z.coerce.date(),
  id: z.string(),
  email: z.string().nullable(),
  role: z.string(),
  masterId: z.string().nullable(),
  nickname: z.string().nullable(),
  blockedAt: z.date().nullable(),
  wallet: z.string().nullable(),
  balance: z.number(),
  debt: z.number(),
  totalIssuedTo: z.number().nullable(),
  totalSettled: z.number().nullable(),
  maxNumberOfUsers: z.number().nullable(),
  maxExposurePerVip: z.number().nullable(),
  managedUsers: z.number().nullable(),
  currentExposure: z.number().optional(),
  predefinedBookieStake: z.number().optional(),
  flexibleBookieStake: z.number().optional(),
  pnl: z.number().optional(),
});

export class MasterStatisticsAdminDto extends createZodDto(
  MasterStatisticsSchema,
) {
  constructor(data: MasterStatisticsAdminDto) {
    super();
    Object.assign(this, data);
  }

  static fromMasterStatistics(
    userStatistics: MasterUserWithStatistics,
  ): MasterStatisticsAdminDto {
    return new MasterStatisticsAdminDto({
      createdAt: userStatistics.createdAt,
      balance: decimalToNumber(userStatistics.balance?.balance) || 0,
      totalIssuedTo:
        decimalToNumber(userStatistics.balance?.totalIssuedTo) || 0,
      totalSettled: decimalToNumber(userStatistics.balance?.totalSettled) || 0,
      blockedAt: userStatistics.blockedAt,
      email: userStatistics.email,
      debt: decimalToNumber(userStatistics.balance?.debt) || 0,
      id: userStatistics.id,
      masterId: userStatistics.masterId,
      wallet: userStatistics.wallet,
      role: userStatistics.roles.at(0)?.name as string,
      nickname: userStatistics.nickname,
      maxExposurePerVip: decimalToNumber(userStatistics.maxExposurePerVip) || 0,
      maxNumberOfUsers: userStatistics.maxNumberOfUsers || 0,
      managedUsers: userStatistics._count.users || null,
      currentExposure: decimalToNumber(userStatistics.currentExposure) || 0,
      pnl: decimalToNumber(userStatistics.pnl) || 0,
      flexibleBookieStake: decimalToNumber(userStatistics.flexibleBookieStake),
      predefinedBookieStake: decimalToNumber(
        userStatistics.predefinedBookieStake,
      ),
    });
  }
}
