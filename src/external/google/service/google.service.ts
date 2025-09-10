import { ENV } from '@common/env';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerifyRecaptchaTokenResponse } from './responses';

@Injectable()
export class GoogleService {
  private readonly _logger = new Logger(GoogleService.name);

  private readonly clientSecret: string = this.configService.getOrThrow<string>(
    ENV.GOOGLE_RECAPTCHA_SECRET_KEY,
  );

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async verifyRecaptchaToken(
    token: string,
  ): Promise<{ success: boolean; score: number } | undefined> {
    this._logger.log('Verify Google Recaptcha Token:', {
      token,
    });
    try {
      const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${this.clientSecret}&response=${token}`;

      const response =
        await this.httpService.axiosRef.post<VerifyRecaptchaTokenResponse>(
          verificationUrl,
        );

      if (!response.data) {
        throw new Error(`Error verifying Recaptcha Token: ${token}`);
      }

      this._logger.log('Google Recaptcha Token Verified:', response.data);

      return response.data;
    } catch (error) {
      this._logger.error(error.message, error?.response?.data);
    }
  }
}
