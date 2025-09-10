import { createZodDto } from '@common/helper/create-zod-dto';
import { CouponGroupReport } from '../types';
import { z } from 'zod';

const CouponGroupReportSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  coupons: z.array(
    z.object({
      id: z.number(),
      code: z.string(),
    })
  ).optional(),
});

export class CouponGroupReportDto extends createZodDto(CouponGroupReportSchema) {
  constructor(input: Partial<CouponGroupReportDto>) {
    super();
    Object.assign(this, input);
  }

  static from(group: CouponGroupReport): CouponGroupReportDto {
    return new CouponGroupReportDto({
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      deletedAt: group.deletedAt,
      coupons: group?.coupons?.map((c) => c.couponCode) || [],
    });
  }
}
