import { extendApi } from '@anatine/zod-openapi';
import { EnumValues, getValues } from '@common/enums/common';
import { z } from 'zod';

export const BonusTriggerConfigTypes = {
  BET_PLACING: 'bet_placing',
  BET_SETTLEMENT: 'bet_settlement',
  DEPOSIT: 'deposit',
  ADMIN_MANUAL: 'admin_manual',
  CASHBACK: 'cashback',
  RAKEBACK: 'rakeback',
  ROLLBACK: 'rollback',
  WAGERING: 'wagering', // If the bonus can be withdrawn after wagering
  TIP: 'tip',
  COUPON_CODE: 'coupon_code',
  COUPON_CODE_FLAT: 'coupon_code_flat',
  COUPON_CODE_NEXT_DEPOSIT: 'coupon_code_next_deposit',
  COUPON_CODE_NEXT_DEPOSIT_WITHDRAWABLE: 'coupon_code_next_deposit_withdrawable',
} as const;

export type BonusTriggerConfigType = EnumValues<typeof BonusTriggerConfigTypes>;
export const BonusTriggerConfigTypeSchema = extendApi(
  z.enum(getValues(BonusTriggerConfigTypes)),
);
