import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { GetExchangeRateBody } from './bodies';
import { GetExchangeRateResponse } from './responses';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';

@Injectable()
export class TatumApi {
  private readonly _logger = new Logger(TatumApi.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async getExchangeRate(
    data: GetExchangeRateBody,
  ): Promise<GetExchangeRateResponse | undefined> {
    try {
      return (
        await this.httpService.axiosRef.post(
          'https://api.tatum.io/v3/tatum/rate',
          data,
          {
            headers: {
              'x-api-key': this.configService.get<string>(ENV.TATUM_API_KEY),
            },
          },
        )
      ).data;
    } catch (error) {
      this._logger.error(error);
    }
  }
}
