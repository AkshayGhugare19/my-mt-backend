import {
  FUNGAMESS_SESSION,
  ONE_HOUR_IN_MS,
} from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { Roles } from '@modules/role/enum/role.enum';
import { ENV } from '@common/env';
import {
  FungamessRegisterPlayerResponse,
  FungamessResponse,
} from '@modules/betting-providers/fungamess/types';
import { UserService } from '@modules/user/services/user.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Decimal } from '@prisma/client/runtime/library';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { User } from '@prisma/client';

@Injectable()
export class FungamessService {
  private readonly logger = new Logger(FungamessService.name);
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  convertPointsToUsd(points: Decimal): Decimal {
    return points.div(this.configService.getOrThrow(ENV.USD_POINTS));
  }

  async getSessionByUserId(userId: string): Promise<string | null> {
    return this.redis.get(`${FUNGAMESS_SESSION}:${userId}`);
  }

  async getSessionByPlayerTag(
    playerTag: string,
  ): Promise<{ token: string | null; user: User } | null> {
    const user = await this.userService.getUserDataByPlayerTag(playerTag);
    const token = await this.redis.get(`${FUNGAMESS_SESSION}:${user?.id}`);
    if (!user) {
      return null;
    }
    return { token, user };
  }

  async createSession(
    userId: string,
    options: { forceRefresh?: boolean } = {},
  ): Promise<{ token: string }> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    if (
      user.roles.some(
        (role) => role.name !== Roles.USER && role.name !== Roles.VIP_USER,
      )
    ) {
      throw new BadRequestException(ErrorMessages.MASTER_CANNOT_PLACE_BET);
    }
    const existingSession = await this.getSessionByUserId(userId);
    if (existingSession && !options.forceRefresh) {
      return { token: existingSession };
    }
    const tokenDuration = this.configService.getOrThrow<string>(
      ENV.FUNGAMESS_JWT_DURATION,
    );
    const token = this.jwtService.sign(
      { playerTag: user.playerTag, sub: user.id },
      {
        secret: this.configService.get<string>(ENV.FUNGAMESS_JWT_SECRET),
        expiresIn: tokenDuration,
      },
    );
    await this.redis.set(
      `${FUNGAMESS_SESSION}:${userId}`,
      token,
      'PX',
      ONE_HOUR_IN_MS,
    );
    return { token };
  }

  async sessionCheck(playerTag: string): Promise<boolean> {
    const user = await this.userService.getUserInfoByPlayerTag(playerTag);

    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    return true;
  }

  async playerDetails(
    playerTag: string,
  ): Promise<FungamessResponse<FungamessRegisterPlayerResponse>> {
    const user = await this.userService.getUserInfoByPlayerTag(playerTag);

    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
    return {
      currency: 'USD',
      language: 'en',
      nickname: user.playerTag,
      status: true,
      userId: user.id,
    };
  }

  async getPlayerBalance(
    playerTag: string,
  ): Promise<{ balance: Decimal; status: true }> {
    const balance = await this.userService.getBalanceByPlayerTag(playerTag);

    if (!balance) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    return {
      balance: balance || new Decimal(0),
      status: true,
    };
  }
}
