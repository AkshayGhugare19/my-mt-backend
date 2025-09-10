import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { SocialAuthService } from '../services/social-auth.service';
import { SocialLoginDto } from '../dto/social-login.dto';
import { LoginResponseDto } from '@modules/authentication/core/dto/login-response.dto';
import { UserDto } from '@modules/user/dto/user.dto';

import { Public } from '@common/decorators/public-route.decorator';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';

@ApiTags('Authentication Social')
@Controller('auth/social')
export class SocialAuthController {
  constructor(private readonly socialAuthService: SocialAuthService) { }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SkipResponseFormatting()
  @ApiCreatedResponse({ type: LoginResponseDto })
  async login(@Body() dto: SocialLoginDto): Promise<LoginResponseDto> {
    const res = await this.socialAuthService.login(dto);

    return new LoginResponseDto({
      token: res.accessToken,
      refreshToken: res.refreshToken,
      user: UserDto.fromUser(res.user),
    });
  }

  @Public()
  @Post('session')
  @HttpCode(HttpStatus.OK)
  @SkipResponseFormatting()
  @ApiCreatedResponse({ type: LoginResponseDto })
  async createSession(@Body() dto: SocialLoginDto): Promise<LoginResponseDto> {
    const res = await this.socialAuthService.login(dto);

    return new LoginResponseDto({
      token: res.accessToken,
      refreshToken: res.refreshToken,
      user: UserDto.fromUser(res.user),
    });
  }
}
