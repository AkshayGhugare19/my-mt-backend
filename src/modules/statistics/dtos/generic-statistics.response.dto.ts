import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

// - Exchange GGR
// - Games GGR
// - Sportsbook GGR
// - Vip-Only GGR
// - Normal Users GGR
// - Overall GGR
export const GenericStatisticsResponseSchema = z.object({
  vipGGR: z.number(),
  normalUserGGR: z.number(),
  overallGGR: z.number(),
});

export type GenericStatisticsType = z.infer<
  typeof GenericStatisticsResponseSchema
>;

@ZodDto()
export class GenericStatisticsResponseDto extends createZodDto(
  GenericStatisticsResponseSchema,
) {
  constructor(data: GenericStatisticsResponseDto) {
    super();

    Object.assign(this, data);
  }
}
