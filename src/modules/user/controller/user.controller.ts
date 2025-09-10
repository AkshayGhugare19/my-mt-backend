import { ForRoles } from '@common/decorators/for-roles.decorator';
import { Public } from '@common/decorators/public-route.decorator';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { Roles } from '@modules/role/enum/role.enum';
import { JwtPayload } from '@modules/authentication/types';
import { ChangePasswordDto } from '@modules/user/dto/change-password.dto';
import { ForgotPasswordDto } from '@modules/user/dto/forgot-password.dto';
import { ResetPasswordDto } from '@modules/user/dto/reset-password.dto';
import { UserStatisticsDto } from '@modules/user/dto/user-statistics.dto';
import { UserPasswordService } from '@modules/user/services/password.service';
import { UserService } from '@modules/user/services/user.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { Update2FADto } from '../dto/update-2fa.dto';
import { ChangeUsernameDto } from '../dto/change-username.dto';
import { SetLanguagePreferenceDto } from '../dto/set-language-preference.dto';
import { SetExchangeWidgetPairPreferenceDto } from '../dto/set-exchange-widget-pair-preference.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@Controller('/users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly passwordService: UserPasswordService,
  ) {}

  @Get('/me')
  @SkipResponseFormatting()
  async getUserInfo(
    @UserContext() { sub }: JwtPayload,
  ): Promise<UserStatisticsDto> {
    const userInfo = await this.userService.getUserInfo(sub);

    if (!userInfo) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    return UserStatisticsDto.fromUser(userInfo);
  }

  @Put('change-password')
  @HttpCode(200)
  @ForRoles([Roles.USER, Roles.VIP_USER])
  async changePassword(
    @UserContext('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    return this.passwordService.changePassword(userId, changePasswordDto);
  }

  @Put('2fa')
  @HttpCode(200)
  @ForRoles([Roles.USER, Roles.VIP_USER])
  async updateTwoFactorAuthentication(
    @UserContext('sub') userId: string,
    @Body() update2fa: Update2FADto,
  ): Promise<void> {
    if (!update2fa.code) {
      return this.userService.sendTwoFactorAuthenticationCode(userId);
    }

    await this.userService.update2FA(userId, update2fa.enable, update2fa.code);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ success: boolean }> {
    await this.passwordService.forgotPassword(forgotPasswordDto);
    return {
      success: true,
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ success: boolean }> {
    await this.passwordService.resetPassword(resetPasswordDto);
    return { success: true };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ success: boolean }> {
    await this.userService.verifyEmailAndActivateUser(verifyEmailDto);
    return { success: true };
  }

  @Put('change-username')
  @ForRoles([Roles.USER, Roles.VIP_USER])
  async changeUsername(
    @UserContext('sub') userId: string,
    @Body() changeUsernameDto: ChangeUsernameDto,
  ): Promise<void> {
    return this.userService.changeUsername(userId, changeUsernameDto.username);
  }

  // For Facebook statistics
  @Patch('sign-up-event')
  @ForRoles([Roles.USER])
  async handleSignUpEvent(@UserContext('sub') userId: string): Promise<void> {
    return this.userService.handleSignUpEvent(userId);
  }

  @Post('preferences/language')
  @ForRoles([Roles.USER, Roles.VIP_USER])
  async setLanguagePreference(
    @UserContext('sub') userId: string,
    @Body() setLanguagePreferenceDto: SetLanguagePreferenceDto,
  ): Promise<void> {
    return this.userService.setLanguagePreference(
      userId,
      setLanguagePreferenceDto.language,
    );
  }

  @Post('preferences/exchange-widget-pair')
  @ForRoles([Roles.USER, Roles.VIP_USER])
  async setExchangeWidgetPairPreference(
    @UserContext('sub') userId: string,
    @Body()
      setExchangeWidgetPairPreferenceDto: SetExchangeWidgetPairPreferenceDto,
  ): Promise<void> {
    return this.userService.setExchangeWidgetPairPreference(
      userId,
      setExchangeWidgetPairPreferenceDto.pair,
    );
  }
}
