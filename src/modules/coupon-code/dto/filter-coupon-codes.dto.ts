import { createZodDto } from '@anatine/zod-nestjs';
import { CouponCodeTypes } from '@modules/coupon-code/enum/coupon-code-type.enum';
import { z } from 'zod';

export const FilterCouponCodesSchema = z.object({
  creatorNickname: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  type: z.nativeEnum(CouponCodeTypes).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  minCurrentStock: z.number().optional(),
  maxCurrentStock: z.number().optional(),
  minTotalStock: z.number().optional(),
  maxTotalStock: z.number().optional(),
  minExpiryDate: z.date().optional(),
  maxExpiryDate: z.date().optional(),
  page: z.number(),
  limit: z.number(),
});

export class FilterCouponCodesDto extends createZodDto(
  FilterCouponCodesSchema,
) {}
