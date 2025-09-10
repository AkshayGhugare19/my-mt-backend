import { UserService } from '@modules/user/services/user.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyPassword } from '@common/helper/encoding/password';
import { LoginResponse, TokenScopes } from '../../types';
import { ConfigService } from '@nestjs/config';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { LoginDto } from '@modules/authentication/core/dto/login.dto';
import { CreateCredentialsUser } from '@modules/user/types';
import { Role } from '@modules/role/enum/role.enum';
import { AuthTokenService } from '@modules/authentication/core/service/auth-token.service';
import { UserBlacklistService } from '@modules/user/services/user-blacklist.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventNamespace } from '@infrastructure/event/namespace';
import { UserLoginEvent, UserLogoutEvent, UserRegisterEvent } from '@infrastructure/event/classes';
import { EvenBetService } from '@modules/betting-providers/evenbet/service/evenbet.service';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { REDIS_KEY__REDEEMABLE_PROMO_CODES } from '@infrastructure/redis/keys';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthenticationService');
  constructor(
    private readonly userService: UserService,
    protected readonly configService: ConfigService,
    private readonly authTokenService: AuthTokenService,
    protected readonly userBlacklistService: UserBlacklistService,
    @InjectRedis() private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
    private readonly evenbetService: EvenBetService,
  ) {}

  /**
   *
   * @param registerUser {@link CreateCredentialsUser}
   * @returns - { success: true }
   * @throws - {@link BadRequestException} message: {@link ErrorMessages.EMAIL_ALREADY_IN_USE} if user with the same email already exists
   */
  async register(
    registerUser: CreateCredentialsUser,
  ): Promise<{ success: true }> {
    const existingUser = await this.userService.findByEmailOrNickname(
      registerUser.email,
    );

    if (existingUser) {
      throw new BadRequestException(ErrorMessages.EMAIL_ALREADY_IN_USE);
    }

    const user = await this.userService.createCredentialsUser(registerUser);

    this.eventEmitter.emit(
      EventNamespace.USER_REGISTER,
      new UserRegisterEvent({
        playerTag: user.playerTag,
        nickname: user.nickname || undefined,
        pmBtag: user.partnerMatrixBtag || undefined,
        pmId: user.partnerMatrixId || undefined,
        countryCode: user.countryCode || undefined,
      }),
    );

    if (registerUser.promoCode) {
      try {
        await this.redis.set(
          `${REDIS_KEY__REDEEMABLE_PROMO_CODES}:${user.id}`,
          registerUser.promoCode,
        );
      } catch (e) {
        this.logger.error(e);
      }
    }

    return {
      success: true,
    };
  }

  /**
   *
   * @param loginDto {@link LoginDto}
   * @returns - {@link LoginResponse}
   * @throws - {@link BadRequestException } message: {@link ErrorMessages.BAD_CREDENTIALS} if password is incorrect or user is not found
   * @throws - {@link NotFoundException} if user is not found
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.userService.findForEmailLogin(loginDto.username);

    if (!user || !user.password) {
      throw new BadRequestException(ErrorMessages.BAD_CREDENTIALS);
    }

    if (await this.userBlacklistService.isBlacklisted(user.id)) {
      throw new UnauthorizedException(ErrorMessages.USER_BLOCKED);
    }

    if (!user.active) {
      await this.userService.resendActivationEmail(user.id);
      throw new BadRequestException(ErrorMessages.USER_NOT_ACTIVE);
    }

    const verificationResult = verifyPassword(loginDto.password, user.password);

    if (!verificationResult) {
      throw new BadRequestException(ErrorMessages.BAD_CREDENTIALS);
    }

    if (user.enable2FA) {
      if (!loginDto.twoFactorAuthenticationCode) {
        await this.userService.sendTwoFactorAuthenticationCode(user.id);
        throw new BadRequestException(
          'TWO_FACTOR_AUTHENTICATION_REQUIRED', // DO NOT CHANGE, GETS CHECKED IN FRONTEND
        );
      }

      const verificationResult =
        await this.userService.verifyTwoFactorAuthentication(
          user.id,
          loginDto.twoFactorAuthenticationCode,
        );

      if (!verificationResult) {
        throw new BadRequestException(
          ErrorMessages.INVALID_TWO_FACTOR_AUTHENTICATION_CODE,
        );
      }
    }

    const userInfo = await this.userService.getUserInfoOrThrow(user.id);
    const firstRole = userInfo.roles.at(0);

    if (!firstRole) {
      this.logger.error(`User does not have any roles: ${user.id}`);
      throw new InternalServerErrorException();
    }

    if (loginDto.countryCode && !userInfo.countryCode) {
      const updatedUser = await this.userService.updateById(user.id, { countryCode: loginDto.countryCode });
      this.eventEmitter.emit(
        EventNamespace.USER_REGISTER,
        new UserRegisterEvent({
          playerTag: updatedUser.playerTag,
          nickname: updatedUser.nickname || undefined,
          pmBtag: updatedUser.partnerMatrixBtag || undefined,
          pmId: updatedUser.partnerMatrixId || undefined,
          countryCode: updatedUser.countryCode || undefined,
          regDate: updatedUser.createdAt || undefined,
        }),
      );
    }

    const { accessToken, refreshToken } =
      await this.authTokenService.generateClientTokens(
        userInfo,
        firstRole.name as Role,
      );

    this.eventEmitter.emit(
      EventNamespace.USER_LOGIN,
      new UserLoginEvent({
        playerId: userInfo.id,
        date: new Date().toISOString(),
      }),
    );
    // TODO: this is temporary; should be done when invalidating previous refresh token
    try {
      await this.evenbetService.logout(userInfo.id).catch(() => {});
    } catch (e) {
      this.logger.error('Failed to reset evenbet session');
    }

    return {
      token: accessToken,
      refreshToken,
      user: userInfo,
    };
  }

  async logOut(userId: string, scope: TokenScopes): Promise<void> {
    if (scope === 'client') {
      this.eventEmitter.emit(
        EventNamespace.USER_LOGOUT,
        new UserLogoutEvent({
          playerId: userId,
          date: new Date().toISOString(),
        }),
      );
    }
    await this.authTokenService.invalidateByUserId(userId, scope);
  }

  async refreshToken(
    refreshToken: string,
    scope: TokenScopes,
  ): Promise<{ token: string; refreshToken: string }> {
    const user = await this.authTokenService.findByRefreshToken(
      refreshToken,
      scope,
    );
    if (!user) {
      throw new UnauthorizedException();
    }

    const userInfo = await this.userService.getUserInfoOrThrow(user.sub);
    const firstRole = userInfo.roles.at(0);
    if (!firstRole) {
      this.logger.error(`User does not have any roles: ${user.sub}`);
      throw new InternalServerErrorException();
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authTokenService.refreshUserTokens(
        {
          userInfo,
          role: firstRole.name as Role,
          oldRefreshToken: refreshToken,
        },
        scope,
      );
    return {
      token: accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
