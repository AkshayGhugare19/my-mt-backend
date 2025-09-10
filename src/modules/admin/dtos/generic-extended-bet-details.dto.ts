import { BaseGameReportItem } from '@modules/admin/types';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const GenericExtendedBetDetailsSchema = z.object({
  id: z.string(),
  date: z.date(),
  amount: z.number(),
  settlement: z.number().optional(),
  previousBalance: z.number().nullable(),
  status: z.string(),
});

export class GenericExtendedBetDetailsDto extends createZodDto(
  GenericExtendedBetDetailsSchema,
) {
  constructor(data: GenericExtendedBetDetailsDto) {
    super();
    if (data) Object.assign(this, data);
  }

  static from(data: BaseGameReportItem): GenericExtendedBetDetailsDto {
    return new GenericExtendedBetDetailsDto({
      id: data.id,
      date: data.date,
      amount: data.amount,
      settlement: data.settlement,
      previousBalance: data.previousBalance,
      status: data.status,
    });
  }
}
