import { z } from 'zod';

export const CouponCodeTypes = {
  FLAT_BALANCE: 0,
  NEXT_DEPOSIT: 1,
  NEXT_DEPOSIT_WITHDRAWABLE: 2,
} as const;

export const CouponCodeSchema = z.nativeEnum(CouponCodeTypes);
export type CouponCodeType = z.infer<typeof CouponCodeSchema>;
