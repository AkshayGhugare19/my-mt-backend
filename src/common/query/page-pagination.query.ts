import { createZodDto } from '@common/helper/create-zod-dto';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { z } from 'zod';

export const PagePaginationQuerySchema = z.object({
  page: z.number({ coerce: true }).optional().default(1),
  limit: z.number({ coerce: true }).optional().default(10),
});

@ZodDto()
export class PagePaginationQueryDto extends createZodDto(
  PagePaginationQuerySchema,
) {
  constructor(data: PagePaginationQueryDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
