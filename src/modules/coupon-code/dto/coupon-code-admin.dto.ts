import { createZodDto } from '@common/helper/create-zod-dto';
import { CodeConfigDto } from '@modules/coupon-code/dto/code-config.dto';
import {
  CouponCodeType,
  CouponCodeTypes,
} from '@modules/coupon-code/enum/coupon-code-type.enum';
import { CodeConfigSchema, CouponCodeConfig } from '@modules/coupon-code/schema/validator/code-config.validator';
import { CouponCode } from '@prisma/client';
import { z } from 'zod';

export const CouponCodeAdminSchema = z.object({
  id: z.number().optional(),
  code: z.string(),
  config: CodeConfigSchema,
  type: z.nativeEnum(CouponCodeTypes),
  stock: z.number().optional(),
  expiresAt: z.date().nullable(),
  disabledAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  groups: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .optional()
});

export class CouponCodeAdminDto extends createZodDto(CouponCodeAdminSchema) {
  constructor(input: Partial<CouponCodeAdminDto>) {
    super();
    Object.assign(this, input);
  }

  static from(input: CouponCode & { groups?: { id: string; name: string }[] }): CouponCodeAdminDto {
    return new CouponCodeAdminDto({
      id: input.id,
      code: input.code,
      config: CodeConfigDto.from(input.config as CouponCodeConfig),
      type: input.type as CouponCodeType,
      stock: input.stock,
      expiresAt: input.expiresAt,
      disabledAt: input.disabledAt,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      groups: input.groups ?? [],
    });
  }
}
