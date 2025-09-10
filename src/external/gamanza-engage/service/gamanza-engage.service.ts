import { ENV } from '@common/env';
import { UserService } from '@modules/user/services/user.service';
import { HttpService } from '@nestjs/axios';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  GetPlayerCardsInformationParams,
  GetPurchaseInformationParams,
  GetRanksLevelsParams,
  GetRanksParams,
  GetRewardShopItemParams,
  GetRewardShopOrderParams,
  GetRewardsInformationParams,
  SendGameTransactionEventParams,
  SendMoneyTransactionEventParams,
  SendSportTransactionEventParams,
  UpdateUserProgressParams,
} from './params';
import { randomUUID } from 'crypto';
import {
  GetPlayerCardsInformationResponse,
  GetPurchaseInformationResponse,
  GetRanksLevelsResponse,
  GetRanksResponse,
  GetRewardShopitemResponse,
  GetRewardShopOrderResponse,
  GetRewardsInformationResponse,
} from './responses';
import { Wrapper } from '@common/types';

interface GamanzaTokenPayload {
  exp: number;
  iat: number;
  jti: string;
  sub: string;
}

@Injectable()
export class GamanzaEngageService {
  private readonly _logger = new Logger(GamanzaEngageService.name);

  private accessToken: string;
  private tokenExpiration: number;

  private readonly clientId: string = this.configService.getOrThrow<string>(ENV.GAMANZA_ENGAGE_CLIENT_ID);

  private readonly clientSecret: string = this.configService.getOrThrow<string>(ENV.GAMANZA_ENGAGE_SECRET_KEY);

  private readonly apiBaseUrl: string = this.configService.getOrThrow<string>(ENV.GAMANZA_ENGAGE_BASE_API_URL);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: Wrapper<UserService>,
  ) {}

  async signIdentityToken(userId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: GamanzaTokenPayload = {
      sub: userId,
      jti: randomUUID(),
      iat: now,
      exp: now + 24 * 60 * 60,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.clientSecret,
    });
  }

  async validateIdentityToken(identityToken: string): Promise<{ userId: string; exp: number }> {
    const decodedToken = await this.jwtService.verifyAsync<GamanzaTokenPayload>(identityToken, {
      secret: this.clientSecret,
    });
    this._logger.debug(decodedToken);

    if (!decodedToken) {
      throw new Error('Error decoding access token for Gamanza Engage.');
    }

    await this.userService.getUserInfoOrThrow(decodedToken.sub);

    return {
      userId: decodedToken.sub,
      exp: decodedToken.exp,
    };
  }

  private async fetchAccessToken(): Promise<string | undefined> {
    try {
      const data = (
        await this.httpService.axiosRef.post(`${this.apiBaseUrl}/api/oauth/v1/token`, {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
        })
      ).data;

      if (!data) {
        throw new Error('Error fetching access token for Gamanza Engage.');
      }

      const token = data.accessToken;

      const decodedToken = await this.jwtService.decode(token);

      if (!decodedToken) {
        throw new Error('Error decoding access token for Gamanza Engage.');
      }

      this.accessToken = token;
      this.tokenExpiration = decodedToken.exp * 1000;

      return token;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiration) {
      return this.accessToken;
    }

    await this.fetchAccessToken();
    return this.accessToken;
  }

  async sendGameTransactionEvent(params: SendGameTransactionEventParams): Promise<void> {
    try {
      await this.getAccessToken();

      this._logger.debug('Sending game transaction event', params);

      const response = await this.httpService.axiosRef.post(
        `${this.apiBaseUrl}/rx-api/transactions/v1/game-transaction-round`,
        params,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      this._logger.log(`Gamanza Engage Game Transaction Event Sent. ${response.status} (${response.statusText})`);
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async sendMoneyTransactionEvent(params: SendMoneyTransactionEventParams): Promise<void> {
    try {
      await this.getAccessToken();

      this._logger.debug('Sending money transaction event', params);

      const response = await this.httpService.axiosRef.post(
        `${this.apiBaseUrl}/rx-api/transactions/v1/money-transaction`,
        params,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this._logger.log(`Gamanza Engage Money Transaction Event Sent. ${response.status} (${response.statusText})`);
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async sendSportTransactionEvent(params: SendSportTransactionEventParams): Promise<void> {
    try {
      await this.getAccessToken();

      this._logger.debug('Sending sport transaction event', params);

      const response = await this.httpService.axiosRef.post(
        `${this.apiBaseUrl}/rx-api/transactions/v1/sport-transaction`,
        params,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      this._logger.log(
        `Gamanza Engage Sport Transaction Event Sent. ${response} ${response.status} (${response.statusText})`,
      );
    } catch (error) {
      this._logger.error(`Gamanza Engage Sport Transaction Error ${error.message}, ${error?.response?.data}`);
    }
  }

  async updateUserProgress(params: UpdateUserProgressParams): Promise<void> {
    try {
      this._logger.debug('Updating user progress', params);

      const user = await this.userService.updateById(params.userId, {
        rank: params.rank,
        level: params.level,
      });

      if (!user) {
        throw new Error('Error updating user');
      }

      this._logger.log(`Updated user progress. Rank: ${user.rank} Level: ${user.level}`);
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async getPlayerCardsInformation(
    params: GetPlayerCardsInformationParams,
  ): Promise<GetPlayerCardsInformationResponse | undefined> {
    try {
      await this.getAccessToken();

      this._logger.debug('Getting player cards information.', params);

      const response = (await this.httpService.axiosRef.get(`${this.apiBaseUrl}/api/data-fetch/v1/ranks/player-cards`, {
        params,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })) as GetPlayerCardsInformationResponse;

      this._logger.log(`Player cards information: ${response.data}`);

      return response;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async getPurchaseInformation(
    params: GetPurchaseInformationParams,
  ): Promise<GetPurchaseInformationResponse | undefined> {
    try {
      await this.getAccessToken();

      const response = await this.httpService.axiosRef.get(
        `${this.apiBaseUrl}/api/data-fetch/v1/reward-shop/orders-aggregates`,
        {
          params,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async getRewardShopItem(params: GetRewardShopItemParams): Promise<GetRewardShopitemResponse | undefined> {
    try {
      await this.getAccessToken();

      const response = await this.httpService.axiosRef.get(`${this.apiBaseUrl}/api/data-fetch/v1/reward-shop/item`, {
        params,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async getRewardShopOrder(params: GetRewardShopOrderParams): Promise<GetRewardShopOrderResponse | undefined> {
    try {
      await this.getAccessToken();

      const response = await this.httpService.axiosRef.get(`${this.apiBaseUrl}/api/data-fetch/v1/reward-shop/order`, {
        params,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async getRanks(params: GetRanksParams): Promise<GetRanksResponse | undefined> {
    try {
      await this.getAccessToken();

      const response = await this.httpService.axiosRef.get(`${this.apiBaseUrl}/api/data-fetch/v1/ranks/ranks`, {
        params,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async getRanksLevels(params: GetRanksLevelsParams): Promise<GetRanksLevelsResponse | undefined> {
    try {
      await this.getAccessToken();

      const response = await this.httpService.axiosRef.get(`${this.apiBaseUrl}/api/data-fetch/v1/ranks/levels`, {
        params,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async getRewardsInformation(params: GetRewardsInformationParams): Promise<GetRewardsInformationResponse | undefined> {
    try {
      await this.getAccessToken();

      const response = await this.httpService.axiosRef.get(
        `${this.apiBaseUrl}/api/data-fetch/v1/reward-processor/rewards`,
        {
          params,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async gamanzaRegistration(id: string): Promise<any> {
    try {
      await this.getAccessToken();

      const response = await this.httpService.axiosRef.post(
        `${this.apiBaseUrl}/rx-api/players-data/v1/registration`,
        {
          playerId: id,
          registrationDevice: 'mobile',
          date: new Date().toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async gamanzaUpdatePlayer(playerId: string, playerTag: string): Promise<any> {
    try {
      await this.getAccessToken();

      const response = await this.httpService.axiosRef.patch(
        `${this.apiBaseUrl}/api/players-data/v1/players/${playerId}`,
        {
          username: playerTag,
          firstName: playerTag,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async gamanzaLoginPlayer({ playerId, date }: { playerId: string; date: string }): Promise<any> {
    try {
      await this.getAccessToken();

      const response = await this.httpService.axiosRef.post(
        `${this.apiBaseUrl}/rx-api/players-data/v1/login`,
        {
          playerId,
          date,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async gamanzaLogoutPlayer({ playerId, date }: { playerId: string; date: string }): Promise<any> {
    try {
      await this.getAccessToken();

      const response = await this.httpService.axiosRef.post(
        `${this.apiBaseUrl}/rx-api/players-data/v1/logout`,
        {
          playerId,
          date: new Date().toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }

  async sendUnsubscribeEvent(params: { playerId: string; campaignId: string }): Promise<void> {
    try {
      await this.getAccessToken();
      this._logger.debug('Sending unsubscribe event', {
        playerId: params.playerId,
        campaignId: params.campaignId,
        reason: 'User unsubscribed',
        date: new Date().toISOString(),
      });
      const response = await this.httpService.axiosRef.post(
        `${this.apiBaseUrl}/rx-api/analytics/v1/register/event/unsubscribe`,
        {
          playerId: params.playerId,
          campaignId: params.campaignId,
          reason: 'User unsubscribed',
          date: new Date().toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );
      this._logger.log(`Gamanza Engage Unsubscribe Event Sent. ${response.status} (${response.statusText})`);
    } catch (error) {
      this._logger.error('Failed to send unsubscribe event', {
        message: error.message,
        data: error?.response?.data,
      });
      throw new Error();
    }
  }
}
