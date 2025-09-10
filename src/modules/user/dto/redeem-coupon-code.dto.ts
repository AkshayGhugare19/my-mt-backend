import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const RedeemCouponCodeSchema = z.object({
  code: z.string(),
});

export class RedeemCouponCodeDto extends createZodDto(RedeemCouponCodeSchema) {}
