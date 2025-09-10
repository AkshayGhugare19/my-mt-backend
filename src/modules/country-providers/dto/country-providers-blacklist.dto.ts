import { createZodDto } from '@common/helper/create-zod-dto';
import { CountryProvidersBlacklist } from '@prisma/client';
import { z } from 'zod';

export const CountryProvidersBlacklistSchema = z.object({
  country: z.string().min(2).max(3),
  providers: z.array(z.string()),
});

export class CountryProvidersBlacklistDto extends createZodDto(CountryProvidersBlacklistSchema) {
  constructor(data: CountryProvidersBlacklistDto) {
    super();
    Object.assign(this, data);
  }

  static from(countryProviders: CountryProvidersBlacklist): CountryProvidersBlacklistDto {
    return new CountryProvidersBlacklistDto(
      CountryProvidersBlacklistDto.createSafe({
        country: countryProviders.country,
        providers: countryProviders.providers,
      }),
    );
  }
}
