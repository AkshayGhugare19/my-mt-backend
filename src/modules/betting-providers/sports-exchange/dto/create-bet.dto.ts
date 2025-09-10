import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateSportsExchangeBetSchema = z.object({
  user_id: z.string(),
  sport_name: z.string(),
  sport_id: z.string(),
  amount: z.number(),
  exposure: z.number(),
  match_name: z.string(),
  match_id: z.string(),
  round_name: z.string(),
  round_id: z.string(),
  size: z.number(),
  odds: z.number(),
  selection: z.string().optional(),
  back_lay: z.number({ coerce: true }),
  transation_id: z.number({ coerce: true }),
});

export class CreateSportsExchangeBetDto extends createZodDto(
  CreateSportsExchangeBetSchema,
) {
  constructor(data: CreateSportsExchangeBetDto) {
    super();
    Object.assign(this, data);
  }
}
