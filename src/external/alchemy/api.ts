import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Bottleneck from 'bottleneck';
import { AxiosResponse } from 'axios';
import { ENV } from '@common/env';
import { AssetTransfersBody } from './bodies';
import { AssetTransfersResponse } from './responses';

@Injectable()
export class AlchemyApi {
  private readonly _logger: Logger;
  private readonly bottleneck: Bottleneck;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this._logger = new Logger(AlchemyApi.name);

    this.bottleneck = new Bottleneck({
      maxConcurrent: 1,
      minTime: 500,
    });
  }

  async getAssetTransfers(
    data: AssetTransfersBody,
  ): Promise<AssetTransfersResponse | undefined> {
    try {
      const result = await this.bottleneck.schedule<
        AxiosResponse<AssetTransfersResponse>
      >(() =>
        this.httpService.axiosRef.post(
          `${this.configService.get<string>(ENV.ALCHEMY_BASE_API_URL)}/${this.configService.get<string>(ENV.ALCHEMY_API_KEY)}`,
          data,
        ),
      );

      return result.data;
    } catch (error) {
      this._logger.error(error);
    }
  }
}
