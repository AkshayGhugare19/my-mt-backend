import { createZodDto } from '@common/helper/create-zod-dto';
import { CodeConfigDto } from '@modules/coupon-code/dto/code-config.dto';
import { CodeConfigSchema, CouponCodeConfig } from '@modules/coupon-code/schema/validator/code-config.validator';
import { CouponCodeReport } from '@modules/coupon-code/types';
import { z } from 'zod';

const CouponCodeReportSchema = z.object({
  creatorNickname: z.string().nullable(),
  id: z.number(),
  code: z.string(),
  type: z.number(),
  config: CodeConfigSchema,
  currentStock: z.number(),
  totalStock: z.number(),
  expiresAt: z.date().nullable(),
  disabledAt: z.date().nullable(),
  createdAt: z.date().nullable(),
  groups: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    )
});

export class CouponCodeReportDto extends createZodDto(CouponCodeReportSchema) {
  constructor(input: Partial<CouponCodeReportDto>) {
    super();
    Object.assign(this, input);
  }

  static from(input: CouponCodeReport): CouponCodeReportDto {
    return new CouponCodeReportDto({
      id: input.id,
      code: input.code,
      type: input.type,
      currentStock: input.stock,
      creatorNickname: input.createdBy?.nickname ?? null,
      config: CodeConfigDto.from(input.config as CouponCodeConfig),
      createdAt: input.createdAt,
      totalStock: input.totalStock,
      disabledAt: input.disabledAt,
      expiresAt: input.expiresAt,
      groups: input.groups ?? []
    });
  }
}
