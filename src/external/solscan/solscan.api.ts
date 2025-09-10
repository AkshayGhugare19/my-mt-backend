import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import { SolscanTransfer } from './types';
import { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';

interface SolscanTransfersResponse {
  success: boolean;
  data: SolscanTransfer[];
}

@Injectable()
export class SolscanApi {
  private readonly _logger = new Logger(SolscanApi.name);
  private readonly bottleneck: Bottleneck;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.bottleneck = new Bottleneck({
      maxConcurrent: 1,
      minTime: 100,
    });
  }

  async getInboundTransfers(address: string, fromTimestamp: number, pageSize = 100): Promise<SolscanTransfer[]> {
    const headers = {
      token: this.configService.get<string>(ENV.SOLSCAN_API_KEY),
    };

    const params = {
      address,
      activity_type: ['ACTIVITY_SPL_TRANSFER'],
      from_time: fromTimestamp,
      exclude_amount_zero: true,
      flow: 'in',
      page: 1,
      page_size: pageSize,
      sort_by: 'block_time',
      sort_order: 'desc',
    };

    try {
      const response = await this.bottleneck.schedule<AxiosResponse<SolscanTransfersResponse>>(
        () =>
          this.httpService.axiosRef.get(
            'https://pro-api.solscan.io/v2.0/account/transfer',
            {
              headers,
              params,
            },
          ),
      );

      if (!response.data.success) {
        throw new Error('Failed to get inbound transfers');
      }

      return response.data.data;
    } catch (error) {
      this._logger.error(error);
      return [];
    }
  }
}
