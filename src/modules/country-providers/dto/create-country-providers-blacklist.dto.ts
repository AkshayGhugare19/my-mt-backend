import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

const CreateCountryProvidersBlacklistSchema = z.object({
  country: z.string().min(2).max(3),
  providers: z.array(z.string()),
});

@ZodDto()
export class CreateCountryProvidersBlacklistDto extends createZodDto(CreateCountryProvidersBlacklistSchema) {
  constructor(data: CreateCountryProvidersBlacklistDto) {
    super();
    Object.assign(this, data);
  }
}
