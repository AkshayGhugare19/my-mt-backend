import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { SymbolPriceTicker } from './params';
import { SymbolPriceTickerResponse } from './responses';

@Injectable()
export class BinanceApi {
  private readonly _logger = new Logger(BinanceApi.name);

  constructor(private readonly httpService: HttpService) {}

  async symbolPriceTicker(
    params: SymbolPriceTicker,
  ): Promise<SymbolPriceTickerResponse | undefined> {
    try {
      return (
        await this.httpService.axiosRef.get(
          'https://api.binance.com/api/v3/ticker/price',
          {
            params,
          },
        )
      ).data;
    } catch (error) {
      this._logger.error(error);
    }
  }
}
