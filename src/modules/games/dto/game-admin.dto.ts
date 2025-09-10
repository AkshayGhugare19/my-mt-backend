import { createZodDto } from '@common/helper/create-zod-dto';
import { SlotegratorGame } from '@prisma/client';
import { z } from 'zod';

export const AdminGameSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  slug: z.string(),
  disabled: z.boolean(),
  available: z.boolean(),
  image: z.string().nullable(),
  type: z.string(),
  provider: z.string(),
  technology: z.string(),
  hasLobby: z.boolean(),
  isMobileFullWindow: z.boolean(),
  hasFreeSpins: z.boolean(),
  hasTables: z.boolean(),
  gameCategoryId: z.string().nullable(),
  gameCategory: z.string().nullable()
});

export class AdminGameDto extends createZodDto(AdminGameSchema) {
  constructor(params: Partial<AdminGameDto>) {
    super();

    Object.assign(this, params);
  }

  static from(params: Partial<SlotegratorGame>): AdminGameDto {
    return new AdminGameDto(AdminGameDto.createSafe({
      ...params,
      id: params.uuid,
    } as AdminGameDto));
  }
}
