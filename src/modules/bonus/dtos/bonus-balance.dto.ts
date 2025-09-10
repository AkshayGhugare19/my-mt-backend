import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { BonusDto, BonusSchema } from '@modules/bonus/dtos/bonus-dto';
import { UserBonusBalanceWithBonus } from '@modules/bonus/types';
import { decimalToNumber } from '@utils/decimal-do-number';
import { z } from 'zod';

export const BonusBalanceSchema = z.object({
  bonus: BonusSchema,
  userId: z.string(),
  balance: z.number(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
});

@ZodDto()
export class BonusBalanceDto extends createZodDto(BonusBalanceSchema) {
  constructor(data: BonusBalanceDto) {
    super();
    Object.assign(this, data);
  }

  static from(data: UserBonusBalanceWithBonus): BonusBalanceDto {
    return new BonusBalanceDto(
      super.create({
        ...data,
        balance: decimalToNumber(data.balance),
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        userId: data.userId,
        bonus: BonusDto.from(data.bonus),
        deletedAt: data.deletedAt,
      } as BonusBalanceDto),
    );
  }
}
