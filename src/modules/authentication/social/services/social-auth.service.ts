import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { SocialLoginDto } from '../dto/social-login.dto';
import { SocialAuthStrategy, SocialProfile } from '../straregies/social-auth.strategy';
import { UserService } from '@modules/user/services/user.service';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { CreateCredentialsUser, UserInfo, UserWithBalance } from '@modules/user/types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventNamespace } from '@infrastructure/event/namespace';
import { UserLoginEvent, UserRegisterEvent } from '@infrastructure/event/classes';
import { AuthTokenService } from '@modules/authentication/core/service/auth-token.service';
import { Role } from '@modules/role/enum/role.enum';

@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);

  constructor(
    private readonly strategy: SocialAuthStrategy,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
    private readonly authTokenService: AuthTokenService,
  ) { }

  async login(
    dto: SocialLoginDto,
  ): Promise<{ user: UserWithBalance; accessToken: string; refreshToken: string }> {
    try {
      // 1) Validate token with provider
      const profile: SocialProfile = await this.strategy.validate({
        idToken: dto.token,
        type: dto.type,
      });

      if (!profile?.email) {
        throw new BadRequestException('Email is required for social login');
      }

      console.log("profile", profile)
      // 2) Find existing user
      let foundUser = await this.userService.findByEmailOrNickname(profile.email);
      this.logger.log(`User lookup for email ${profile.email}: ${foundUser ? 'found' : 'not found'}`);

      let user: any;
      let isNewUser = false;

      console.log("profile.....................", profile)

      // 3) Create user if doesn't exist or use existing user
      if (!foundUser) {
        user = await this.userService.createCredentialsSocialUser(profile);
        this.logger.log('Creating new social user', user);
        isNewUser = true;

        if (!user) {
          throw new InternalServerErrorException('Failed to create new user');
        }

        this.logger.log(`New user created with ID: ${user.id}`);

        // Emit user registration event for new users
        this.eventEmitter.emit(
          EventNamespace.USER_REGISTER,
          new UserRegisterEvent({
            playerTag: user.playerTag,
            nickname: user.nickname || undefined,
            pmBtag: user.partnerMatrixBtag || undefined,
            pmId: user?.partnerMatrixId || undefined,
            countryCode: user?.countryCode || undefined,
          }),
        );
      }
      user = user || foundUser
      const userWithRoles = await this.userService.getUserInfo(user?.id);
      if (!userWithRoles) {
        throw new InternalServerErrorException('Failed to retrieve user details');
      }
      user = userWithRoles;

      console.log("user", user)

      // 4) Validate user has roles
      if (!user?.roles || user?.roles.length === 0) {
        throw new InternalServerErrorException('User has no assigned roles');
      }

      // 5) Get user role for token generation
      const firstRole = user.roles[0];
      const roleName = firstRole.name as Role;

      this.logger.log(`Generating tokens for user: ${user.id} with role: ${roleName}`);

      // 6) Generate authentication tokens
      const { accessToken, refreshToken } = await this.authTokenService.generateClientTokens(user, roleName);
      console.log("accessToken, refreshToken", accessToken, refreshToken)

      if (!accessToken || !refreshToken) {
        throw new InternalServerErrorException('Failed to generate authentication tokens');
      }



      // 8) Emit login event
      this.eventEmitter.emit(
        EventNamespace.USER_LOGIN,
        new UserLoginEvent({
          playerId: user.id,
          date: new Date().toISOString(),
        }),
      );

      this.logger.log(`Social login successful for user: ${user.id}${isNewUser ? ' (new user)' : ''}`);

      return {
        user,
        accessToken,
        refreshToken,
      };

    } catch (error) {
      this.logger.error('Social login failed', {
        email: dto?.token ? 'provided' : 'missing',
        type: dto?.type,
        error: error.message,
        stack: error.stack,
      });

      // Re-throw known NestJS exceptions
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      // Handle unexpected errors
      throw new InternalServerErrorException('Social login failed due to an unexpected error');
    }
  }
}