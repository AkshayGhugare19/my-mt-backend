import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const FilterCouponGroupsSchema = z.object({
  name: z.string().min(1).optional(),
  page: z.number(),
  limit: z.number(),
});

export class FilterCouponGroupsDto extends createZodDto(FilterCouponGroupsSchema) {}
