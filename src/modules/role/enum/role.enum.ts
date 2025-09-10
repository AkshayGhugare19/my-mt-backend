import { getValues } from '@common/enums/common';
import { z } from 'zod';

export const Roles = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  MASTER: 'MASTER',
  SUPER_MASTER: 'SUPER_MASTER',
  VIP_USER: 'VIP',
  RISK_MANAGEMENT: 'RISK_MANAGEMENT',
  RISK_MANAGEMENT_TRAINEE: 'RISK_MANAGEMENT_TRAINEE',
  ACCOUNTANT: 'ACCOUNTANT',
  CUSTOMER_SUPPORT: 'CUSTOMER_SUPPORT',
  MARKETING: 'MARKETING',
  PARTNER: 'PARTNER',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const UserRoleSchema = z.enum(getValues(Roles));
