import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

const UpdateCountryProvidersBlacklistSchema = z.object({
  providers: z.array(z.string()).default([]),
});

@ZodDto()
export class UpdateCountryProvidersBlacklistDto extends createZodDto(UpdateCountryProvidersBlacklistSchema) {
  constructor(data: UpdateCountryProvidersBlacklistDto) {
    super();
    Object.assign(this, data);
  }
}
