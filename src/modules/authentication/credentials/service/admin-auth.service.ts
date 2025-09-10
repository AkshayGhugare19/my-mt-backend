import { Role } from '@modules/role/enum/role.enum';
import { verifyPassword } from '@common/helper/encoding/password';
import { UserService } from '@modules/user/services/user.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { AuthTokenService } from '@modules/authentication/core/service/auth-token.service';
import { LoginResponse } from '@modules/authentication/types';
import { UserBlacklistService } from '@modules/user/services/user-blacklist.service';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly authTokenService: AuthTokenService,
    private readonly userBlacklistService: UserBlacklistService,
  ) {}

  async login(
    email: string,
    password: string,
    twoFactorAuthenticationCode?: string,
  ): Promise<LoginResponse> {
    const user = await this.userService.findForMasterLogin(email);
    if (!user) {
      throw new UnauthorizedException();
    }

    if (await this.userBlacklistService.isBlacklisted(user.id)) {
      throw new UnauthorizedException(ErrorMessages.USER_BLOCKED);
    }

    const verificationResult = verifyPassword(password, user.password);

    if (!verificationResult) {
      throw new UnauthorizedException();
    }

    if (user.enable2FA) {
      if (!twoFactorAuthenticationCode) {
        await this.userService.sendTwoFactorAuthenticationCode(user.id);
        throw new BadRequestException(
          'TWO_FACTOR_AUTHENTICATION_REQUIRED', // DO NOT CHANGE, GETS CHECKED IN FRONTEND
        );
      }

      const verificationResult =
        await this.userService.verifyTwoFactorAuthentication(
          user.id,
          twoFactorAuthenticationCode,
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
    // TODO - change to multiple role system when needed
    const { accessToken, refreshToken } =
      await this.authTokenService.generateAdminTokens(
        userInfo,
        firstRole.name as Role,
      );

    return {
      token: accessToken,
      user: userInfo,
      refreshToken,
    };
  }
}
