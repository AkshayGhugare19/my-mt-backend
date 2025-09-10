import { Public } from '@common/decorators/public-route.decorator';
import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  Headers,
} from '@nestjs/common';
import { GamanzaEngageService } from '../service/gamanza-engage.service';
import { GamanzaEngageAuthEventDto } from '../dto/auth.dto';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import { calculateWebhookSignature } from '../service/client';
import {
  GamanzaEngageEventResult,
  GamanzaEngageEventResultSchema,
  GamanzaEngageLevelUpEvent,
  GamanzaEngageLevelUpEventSchema,
  GamanzaEngageRankUpEvent,
  GamanzaEngageRankUpEventSchema,
} from '../dto/event.dto';

@Public()
@Controller('gamanza/api')
export class GamanzaEngageWebhookController {
  private readonly _logger = new Logger(GamanzaEngageWebhookController.name);

  private readonly signatureKey = this.configService.getOrThrow(
    ENV.GAMANZA_ENGAGE_SIGNATURE_KEY,
  );

  constructor(
    private readonly gamanzaEngageApi: GamanzaEngageService,
    private readonly configService: ConfigService,
  ) {}

  @Post('auth/v1/player')
  @SkipResponseFormatting()
  async handleValidateIdentityToken(
    @Body() event: GamanzaEngageAuthEventDto,
  ): Promise<{
    playerId: string;
    expiresAt?: string;
  }> {
    const { userId, exp } = await this.gamanzaEngageApi.validateIdentityToken(
      event.identityToken,
    );

    this._logger.debug(new Date(exp * 1000).toISOString(), userId);

    return {
      playerId: userId,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  @Post('event')
  @Public()
  @SkipResponseFormatting()
  @HttpCode(200)
  async handleEvent(
    @Headers('x-gmz-pep-webhook-timestamp') timestamp: string,
    @Headers('x-gmz-pep-webhook-signature') expectedSignature: string,
    @Body() body: GamanzaEngageEventResult,
  ): Promise<void> {
    this._logger.log(
      'Received event - Initial',
      {
        'x-gmz-pep-webhook-timestamp': timestamp,
        'x-gmz-pep-webhook-signature': expectedSignature,
      },
      body,
      this.signatureKey,
    );

    const signature = calculateWebhookSignature(
      body,
      timestamp,
      this.signatureKey,
    );

    this._logger.log(
      'Received event - Signature',
      {
        'x-gmz-pep-webhook-timestamp': timestamp,
        'x-gmz-pep-webhook-signature': expectedSignature,
      },
      body,
      signature,
      this.signatureKey,
    );

    if (signature !== expectedSignature) {
      this._logger.error('Invalid signature.');
      throw new Error('Invalid signature.');
    }

    const parseBaseEvent = GamanzaEngageEventResultSchema.safeParse(body);

    if (!parseBaseEvent.success) {
      throw new Error('Unhandled event!');
    }
    const events = parseBaseEvent.data.events;

    for (const event of events) {
      if (event.eventName === 'level_up') {
        const eventResult = GamanzaEngageLevelUpEventSchema.safeParse(event);
        if (!eventResult.success) {
          this._logger.error(
            `Invalid payload for ${event.eventName}`,
            eventResult.error,
          );
          throw new Error(`Invalid payload for ${event.eventName}`);
        }

        return this.handleUserProgressEvent(event);
      }

      if (event.eventName === 'rank_up') {
        const eventResult = GamanzaEngageRankUpEventSchema.safeParse(event);
        if (!eventResult.success) {
          this._logger.error(
            `Invalid payload for ${event.eventName}`,
            eventResult.error,
          );
          throw new Error(`Invalid payload for ${event.eventName}`);
        }

        return this.handleUserProgressEvent(event);
      }
    }
  }

  private async handleUserProgressEvent(
    event: GamanzaEngageLevelUpEvent | GamanzaEngageRankUpEvent,
  ): Promise<void> {
    const levelField = event.payload.find(
      (field) => field.key === 'CurrentLevel',
    );

    const rankField = event.payload.find(
      (field) => field.key === 'CurrentRankExternalName',
    );

    if (!levelField && !rankField) {
      return;
    }

    await this.gamanzaEngageApi.updateUserProgress({
      userId: event.playerId,
      level: levelField ? Number(levelField.value) : undefined,
      rank: rankField ? String(rankField.value) : undefined,
    });
  }

  @Post('unsubscribe')
  @Public()
  @HttpCode(200)
  async unsubscribe(
      @Body() body: { playerId: string; campaignId: string; reason: string }
  ): Promise<void> {
    await this.gamanzaEngageApi.sendUnsubscribeEvent(body);
  }
}
