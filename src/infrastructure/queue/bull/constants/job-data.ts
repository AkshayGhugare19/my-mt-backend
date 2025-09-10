import { BonusTriggerConfigType } from '@modules/bonus/enum';
import { Role } from '@modules/role/enum/role.enum';
import { Bet } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type SendForgotPasswordMailJobData = {
  userEmail: string;
  userRole: Role;
  code: string;
};

export type SendVerificationMailJobData = {
  userEmail: string;
  code: string;
};

export type SendTwoFactorAuthenticationCodeMailJobData = {
  userEmail: string;
  code: string;
};

export type GamanzaRewardBonusJobData = {
  userId: string;
  bonusId: string;
};

export type BonusRakebackJobData = {
  userId: string;
  totalRake: number;
  bonusId: string;
  bonusName: string;
};

export type ProcessWageringProgressJobData = {
  bet: Bet;
  wageringBonusId: string;
  wageringProgress: Decimal | null;
  targetBonusTypes?: BonusTriggerConfigType[];
  excludeBonusIds: string[];
};

export type ProcessWageringBetCompletedJobData = {
  wageringProgressIds: string[];
};
