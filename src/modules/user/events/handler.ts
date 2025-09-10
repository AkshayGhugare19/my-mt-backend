import { ENV } from '@common/env';
import { UserRegisterEvent } from '@infrastructure/event/classes';
import { EventNamespace } from '@infrastructure/event/namespace';
import { REDIS_KEY__PARTNER_MATRIX_REGISTERS } from '@infrastructure/redis/keys';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { RegisterNewPlayerBody } from '@external/partner-matrix/bodies';

@Injectable()
export class UserEventHandler {
  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @OnEvent(EventNamespace.USER_REGISTER)
  async handlerUserRegister(eventData: UserRegisterEvent): Promise<void> {
    if (!eventData.pmId || !eventData.pmBtag) return;

    const redisData: RegisterNewPlayerBody = {
      // if regDate is provided, it means that this is an update
      update: eventData.regDate ? true : undefined,
      date: (eventData.regDate ?? new Date()).toISOString().slice(0, 10),
      btag: eventData.pmBtag,
      player: {
        skin_id: this.configService.getOrThrow<number>(ENV.PM_SKIN_ID),
        external_id: eventData.pmId,
        nickname: eventData.nickname,
        username: eventData.playerTag,
        country: eventData.countryCode,
        reg_date: (eventData.regDate ?? new Date()).toISOString().slice(0, 10),
      },
    };

    await this.redis.lpush(
      REDIS_KEY__PARTNER_MATRIX_REGISTERS,
      JSON.stringify(redisData),
    );
  }
}
