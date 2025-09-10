import { MasterUser } from '@modules/admin/types';
import { Permission } from '@modules/permission/enum/permission.enum';
import { decimalToNumber } from '@utils/decimal-do-number';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const AdminSchema = z.object({
  createdAt: z.coerce.date(),
  id: z.string(),
  email: z.string(),
  enable2FA: z.boolean(),
  role: z.string(),
  balance: z.number(),
  debt: z.number().optional(),
  totalIssuedTo: z.number().optional(),
  totalSettled: z.number().optional(),
  nickname: z.string().optional(),
  wallet: z.string().optional(),
  resetPasswordRequired: z.boolean().optional(),
  maxExposurePerVip: z.number().nullable(),
  maxNumberOfUsers: z.number().nullable(),
  managedUsers: z.number().nullable(),
  pnl: z.number().optional(),
  currentExposure: z.number().optional(),
  permissions: z.array(z.string()),
  predefinedBookieStake: z.number().optional(),
  flexibleBookieStake: z.number().optional(),
});

export class AdminDto extends createZodDto(AdminSchema) {
  constructor(data: AdminDto) {
    super();
    Object.assign(this, data);
  }

  static from(user: MasterUser & { permissions: Permission[] }): AdminDto {
    return new AdminDto({
      createdAt: user.createdAt,
      balance: decimalToNumber(user.balance) || 0,
      debt: decimalToNumber(user.debt),
      email: user.email || '',
      enable2FA: user.enable2FA,
      role: user.roles.at(0)?.name as string,
      id: user.id,
      wallet: user.wallet || undefined,
      nickname: user.nickname || undefined,
      resetPasswordRequired: user.resetPasswordRequired || false,
      totalIssuedTo: decimalToNumber(user.totalIssuedTo) || 0,
      totalSettled: decimalToNumber(user.totalSettled) || 0,
      maxExposurePerVip: decimalToNumber(user.maxExposurePerVip) || 0,
      maxNumberOfUsers: user.maxNumberOfUsers,
      managedUsers: user.managedUsers,
      pnl: decimalToNumber(user.pnl) || 0,
      currentExposure: decimalToNumber(user.currentExposure) || 0,
      permissions: user.permissions,
      predefinedBookieStake: decimalToNumber(user.predefinedBookieStake),
      flexibleBookieStake: decimalToNumber(user.flexibleBookieStake),
    });
  }
}
