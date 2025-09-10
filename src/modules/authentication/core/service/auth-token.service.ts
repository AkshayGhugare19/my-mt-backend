import { ENV } from '@common/env';
import {
  getJwtBlacklistRedisKey,
  getRefreshTokenRedisKey,
  getUserRefreshTokenRedisKey,
} from '@common/helper/redis-keys';
import { runWithRetry } from '@common/helper/run-with-retry';
import { CORE_JWT_ADMIN_SERVICE, CORE_JWT_SERVICE } from '@modules/authentication/core/constants';
import { JwtPayload, TokenScopes } from '@modules/authentication/types';
import { EvenBetService } from '@modules/betting-providers/evenbet/service/evenbet.service';
import { Role } from '@modules/role/enum/role.enum';
import { UserInfo } from '@modules/user/types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { convertJwtDurationInMs } from '@utils/convert-jwt-duration-in-time';
import { randomBytes, randomUUID } from 'crypto';
import { Redis } from 'ioredis';

@Injectable()
export class AuthTokenService {
  private readonly logger = new Logger(AuthTokenService.name);
  constructor(
    @InjectRedis()
    private readonly redis: Redis,
    @Inject(CORE_JWT_ADMIN_SERVICE)
    protected readonly adminJwtService: JwtService,
    @Inject(CORE_JWT_SERVICE)
    protected readonly clientJwtService: JwtService,
    protected readonly configService: ConfigService,
    private readonly evenbetService: EvenBetService,
  ) {}

  generateJwt(
    { role, userInfo }: { userInfo: UserInfo; role: Role },
    scope: TokenScopes,
  ): string {
    const payload: Omit<JwtPayload, 'exp' | 'jti'> = {
      sub: userInfo.id,
      playerTag: userInfo.playerTag,
      role,
      iat: Math.floor(Date.now() / 1000),
    };

    return scope === 'admin'
      ? this.generateAdminJwt(payload)
      : this.generateClientJwt(payload);
  }

  private generateAdminJwt(payload: Omit<JwtPayload, 'exp' | 'jti'>): string {
    return this.adminJwtService.sign(payload, {
      jwtid: randomUUID(),
      issuer: this.configService.get<string>(ENV.JWT_ISSUER),
      secret: this.configService.get<string>(ENV.JWT_ADMIN_SECRET),
      expiresIn: this.configService.get<string>(ENV.JWT_ADMIN_DURATION),
    });
  }

  private generateClientJwt(payload: Omit<JwtPayload, 'exp' | 'jti'>): string {
    return this.clientJwtService.sign(payload, {
      jwtid: randomUUID(),
      issuer: this.configService.get<string>(ENV.JWT_ISSUER),
      expiresIn: this.configService.get<string>(ENV.JWT_DURATION),
    });
  }

  async generateRefreshToken(): Promise<string> {
    const tries = 10;
    for (let i = 0; i < tries; i++) {
      const refreshToken = randomBytes(64).toString('base64');
      const key = getRefreshTokenRedisKey(refreshToken);
      const existing = await this.redis.get(key);
      if (!existing) {
        return refreshToken;
      }
    }
    throw new Error('Could not generate refresh token');
  }

  async generateClientTokens(
    userInfo: UserInfo,
    role: Role,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = await this.generateRefreshToken();
    const accessToken = this.generateJwt({ userInfo, role }, 'client');

    const key = getRefreshTokenRedisKey(refreshToken);
    const userRedisKey = getUserRefreshTokenRedisKey(userInfo.id);

    await this.invalidateByUserId(userInfo.id, 'client');

    await this.redis.set(
      key,
      accessToken,
      'PX',
      convertJwtDurationInMs(
        this.configService.getOrThrow(ENV.REFRESH_TOKEN_DURATION),
      ),
    );
    await this.redis.set(
      userRedisKey,
      refreshToken,
      'PX',
      convertJwtDurationInMs(
        this.configService.getOrThrow(ENV.REFRESH_TOKEN_DURATION),
      ),
    );

    return { accessToken, refreshToken };
  }

  async generateAdminTokens(
    userInfo: UserInfo,
    role: Role,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = await this.generateRefreshToken();
    const accessToken = this.generateJwt({ userInfo, role }, 'admin');

    const key = getRefreshTokenRedisKey(refreshToken);
    const userRedisKey = getUserRefreshTokenRedisKey(userInfo.id);

    await this.invalidateByUserId(userInfo.id, 'admin');

    await this.redis.set(
      key,
      accessToken,
      'PX',
      convertJwtDurationInMs(
        this.configService.getOrThrow(ENV.ADMIN_REFRESH_TOKEN_DURATION),
      ),
    );
    await this.redis.set(
      userRedisKey,
      refreshToken,
      'PX',
      convertJwtDurationInMs(
        this.configService.getOrThrow(ENV.ADMIN_REFRESH_TOKEN_DURATION),
      ),
    );

    return { accessToken, refreshToken };
  }

  findRefreshTokenByUser(
    userId: string,
    scope: TokenScopes,
  ): Promise<string | null> {
    const key = getUserRefreshTokenRedisKey(userId);
    return this.redis.get(key);
  }

  async findByRefreshToken(
    refreshToken: string,
    scope: TokenScopes,
  ): Promise<JwtPayload | null> {
    const key = getRefreshTokenRedisKey(refreshToken);
    const token = await this.redis.get(key);

    if (!token) {
      return null;
    }

    try {
      const user: JwtPayload =
        scope === 'admin'
          ? this.adminJwtService.decode(token, { json: true })
          : this.clientJwtService.decode(token, { json: true });

      if (!user) {
        return null;
      }
      return user;
    } catch (error) {
      return null;
    }
  }

  async refreshUserTokens(
    {
      oldRefreshToken,
      role,
      userInfo,
    }: { userInfo: UserInfo; role: Role; oldRefreshToken: string },
    scope: 'admin' | 'client',
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshTokenKey = getRefreshTokenRedisKey(oldRefreshToken);
    const existingToken = await this.redis.get(refreshTokenKey);

    if (existingToken) {
      await this.addTokenToBlackList(existingToken, scope);
    }
    return scope === 'admin'
      ? this.generateAdminTokens(userInfo, role)
      : this.generateClientTokens(userInfo, role);
  }

  async invalidateByUserId(userId: string, scope: TokenScopes): Promise<boolean> {
    const key = getUserRefreshTokenRedisKey(userId);
    const refreshToken = await this.redis.get(key);

    if (!refreshToken) {
      return false;
    }

    const tokenKey = getRefreshTokenRedisKey(refreshToken);

    const accessToken = await this.redis.get(tokenKey);

    if (!accessToken) {
      return false;
    }

    try {
      await runWithRetry(async () => {
        await this.addTokenToBlackList(accessToken, scope);
      }, 3);
      await runWithRetry(async () => {
        await this.redis.del(key);
      }, 3);
      await runWithRetry(async () => {
        await this.redis.del(tokenKey);
      }, 3);
      await this.evenbetService.logout(userId).catch(() => {});
      return true;
    } catch (error) {
      this.logger.error(
        {
          message: 'Error while invalidating token',
          stack: error.stack,
          refreshToken,
        },
        'invalidateByUserId',
      );
      return false;
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistKey = getJwtBlacklistRedisKey(token);
    return !!(await this.redis.get(blacklistKey));
  }

  async addTokenToBlackList(token: string, scope: TokenScopes): Promise<void> {
    const data =
      scope === 'admin'
        ? this.adminJwtService.decode(token, { json: true })
        : this.clientJwtService.decode(token, { json: true });

    if (!data) {
      return;
    }
    const timeLeft = data.exp - Math.floor(Date.now() / 1000);
    if (timeLeft <= 0) return;

    const blacklistKey = getJwtBlacklistRedisKey(token);
    await this.redis.set(blacklistKey, 'blacklisted', 'EX', timeLeft);
  }
}
