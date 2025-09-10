import { createZodDto } from '@common/helper/create-zod-dto';
import {
  CodeConfigSchema,
  CouponCodeConfig,
} from '@modules/coupon-code/schema/validator/code-config.validator';

export class CodeConfigDto extends createZodDto(CodeConfigSchema) {
  constructor(data: CodeConfigDto) {
    super();
    Object.assign(this, data);
  }

  static from(data: CouponCodeConfig): CodeConfigDto {
    return new CodeConfigDto({
      ...data,
      rolloverTargetMultiplier: data.rolloverTargetMultiplier
        ? Number(data.rolloverTargetMultiplier) / 100
        : data.rolloverTargetMultiplier,
    });
  }
}
