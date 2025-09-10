import { ENV } from '@common/env';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PriceConversionResponse } from './responses';

@Injectable()
export class CoinmarketcapApi {
  private readonly _logger = new Logger(CoinmarketcapApi.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async priceConversion(
    amount: number,
    id: string,
    convertId: string,
  ): Promise<PriceConversionResponse | undefined> {
    try {
      return (
        await this.httpService.axiosRef.get(
          'https://pro-api.coinmarketcap.com/v2/tools/price-conversion',
          {
            headers: {
              'X-CMC_PRO_API_KEY': this.configService.get<string>(
                ENV.COINMARKETCAP_API_KEY,
              ),
            },
            params: {
              amount,
              id,
              convert_id: convertId,
            },
          },
        )
      ).data;
    } catch (error) {
      this._logger.error(error);
    }
  }
}
