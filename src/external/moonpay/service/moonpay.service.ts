import { ENV } from '@common/env';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateUrlSignature } from './client';

@Injectable()
export class MoonPayService {
  private readonly _logger = new Logger(MoonPayService.name);

  private readonly clientSecret: string = this.configService.getOrThrow<string>(
    ENV.MOONPAY_SECRET_KEY,
  );

  constructor(private readonly configService: ConfigService) {}

  signUrl(url: string): string {
    const generatedSignature = generateUrlSignature(url, this.clientSecret);

    this._logger.log('MoonPay Sign URL:', {
      url,
      secret: this.clientSecret,
      generatedSignature,
    });

    return generatedSignature;
  }
}
