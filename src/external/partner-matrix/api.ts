import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import {
  CreateTransactionBody,
  CreateTransactionBulkBody,
  RegisterNewPlayerBody,
  UpdateTransactionBody,
  UpdateTransactionBulkBody,
} from './bodies';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import {
  CreateTransactionBulkResponse,
  CreateTransactionResponse,
  GetPlayerDataResponse,
  RegisterNewPlayerResponse,
  UpdateTransactionBulkResponse,
  UpdateTransactionResponse,
} from './responses';
import axiosRetry from 'axios-retry';

@Injectable()
export class PartnerMatrixApi {
  private readonly _logger = new Logger(PartnerMatrixApi.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    axiosRetry(this.httpService.axiosRef, {
      retries: 3,
      retryDelay: () => {
        return axiosRetry.exponentialDelay(3, undefined, 3);
      },
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error);
      },
    });
  }

  async registerNewPlayer(
    data: RegisterNewPlayerBody,
  ): Promise<RegisterNewPlayerResponse | undefined> {
    try {
      return (
        await this.httpService.axiosRef.post(
          `${this.configService.get<string>(ENV.PM_URL)}${this.configService.get<number>(ENV.PM_SKIN_ID)}/player/register`,
          data,
          {
            headers: {
              Authorization: this.configService.get<string>(ENV.PM_AUTH_KEY),
            },
          },
        )
      ).data;
    } catch (error) {
      this._logger.error(error);
    }
  }

  async getPlayerData(id: number): Promise<GetPlayerDataResponse | undefined> {
    try {
      return (
        await this.httpService.axiosRef.get(
          `${this.configService.get<string>(ENV.PM_URL)}${this.configService.get<number>(ENV.PM_SKIN_ID)}/player/getPlayerByExternalId/${id}`,
          {
            headers: {
              Authorization: this.configService.get<string>(ENV.PM_AUTH_KEY),
            },
          },
        )
      ).data;
    } catch (error) {
      this._logger.error(error);
    }
  }

  async createTransaction(
    data: CreateTransactionBody,
  ): Promise<CreateTransactionResponse | undefined> {
    try {
      return (
        await this.httpService.axiosRef.post(
          `${this.configService.get<string>(ENV.PM_URL)}${this.configService.get<number>(ENV.PM_SKIN_ID)}/transaction/create`,
          data,
          {
            headers: {
              Authorization: this.configService.get<string>(ENV.PM_AUTH_KEY),
            },
          },
        )
      ).data;
    } catch (error) {
      Logger.error({ message: error?.message, error: error?.response?.data, stack: error?.stack }, 'PartnerMatrixApi.createTransaction');
      this._logger.error(error);
    }
  }

  async updateTransaction(
    data: UpdateTransactionBody,
  ): Promise<UpdateTransactionResponse | undefined> {
    try {
      return (
        await this.httpService.axiosRef.post(
          `${this.configService.get<string>(ENV.PM_URL)}${this.configService.get<number>(ENV.PM_SKIN_ID)}/transaction/update`,
          data,
          {
            headers: {
              Authorization: this.configService.get<string>(ENV.PM_AUTH_KEY),
            },
          },
        )
      ).data;
    } catch (error) {
      Logger.error({ message: error?.message, error: error?.response?.data, stack: error?.stack }, 'PartnerMatrixApi.updateTransaction');
      this._logger.error(error);
    }
  }

  async createTransactionBulk(
    data: CreateTransactionBulkBody,
  ): Promise<CreateTransactionBulkResponse | undefined> {
    try {
      const response = (
        await this.httpService.axiosRef.post(
          `${this.configService.get<string>(ENV.PM_URL)}${this.configService.get<number>(ENV.PM_SKIN_ID)}/transaction/createBulk`,
          data,
          {
            headers: {
              Authorization: this.configService.get<string>(ENV.PM_AUTH_KEY),
            },
          },
        )
      );
      if (!response.data) {
        throw new Error('No data returned from PartnerMatrixApi.createTransactionBulk');
      }
      return response.data;
    } catch (error) {
      Logger.error({ message: error?.message, error: error?.response?.data, stack: error?.stack }, 'PartnerMatrixApi.createTransactionBulk');
      this._logger.error(error);
    }
  }

  async updateTransactionBulk(
    data: UpdateTransactionBulkBody,
  ): Promise<UpdateTransactionBulkResponse | undefined> {
    try {
      return (
        await this.httpService.axiosRef.post(
          `${this.configService.get<string>(ENV.PM_URL)}${this.configService.get<number>(ENV.PM_SKIN_ID)}/transaction/updateBulk`,
          data,
          {
            headers: {
              Authorization: this.configService.get<string>(ENV.PM_AUTH_KEY),
            },
          },
        )
      ).data;
    } catch (error) {
      Logger.error({ message: error?.message, error: error?.response?.data, stack: error?.stack }, 'PartnerMatrixApi.updateTransactionBulk');
      this._logger.error(error);
    }
  }
}
