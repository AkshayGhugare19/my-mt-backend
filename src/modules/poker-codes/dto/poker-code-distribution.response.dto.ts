import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { UserRoleSchema } from '@modules/role/enum/role.enum';
import { z } from 'zod';

export const PokerCodeDistributionsResponseSchema = z.object({
  id: z.number(),
  user: z.object({
    id: z.string(),
    nickname: z.string().optional().nullable(),
    wallet: z.string().optional().nullable(),
    type: UserRoleSchema,
  }),
  code: z.string(),
  createdAt: z.date(),
});

@ZodDto()
export class PokerCodeDistributionsResponseDto extends createZodDto(
  PokerCodeDistributionsResponseSchema,
) {
  constructor(data: PokerCodeDistributionsResponseDto) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }
}

export type PokerCodeDistributionsResponse = z.infer<
  typeof PokerCodeDistributionsResponseSchema
>;
