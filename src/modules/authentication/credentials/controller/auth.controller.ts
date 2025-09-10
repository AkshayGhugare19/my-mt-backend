import { Public } from '@common/decorators/public-route.decorator';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { ENV } from '@common/env';
import { LoginResponseDto } from '@modules/authentication/core/dto/login-response.dto';
import { LoginDto } from '@modules/authentication/core/dto/login.dto';
import { AuthService } from '@modules/authentication/core/service/auth.service';
import { UserDto } from '@modules/user/dto/user.dto';
import { CacheKey } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { exportJWK, importSPKI, JWK } from 'jose';

@ApiTags('Authentication Credentials')
@Controller('auth')
export class CredentialsAuthController {
  constructor(
    private readonly authenticationService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SkipResponseFormatting()
  @ApiCreatedResponse({
    type: LoginResponseDto,
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const loginResponse = await this.authenticationService.login(loginDto);
    return new LoginResponseDto({
      token: loginResponse.token,
      user: UserDto.fromUser(loginResponse.user),
      refreshToken: loginResponse.refreshToken,
    });
  }

  @Public()
  @Get('.well-known/jwks.json')
  @HttpCode(HttpStatus.OK)
  @CacheKey('jwks')
  @SkipResponseFormatting()
  async getJWKSet(): Promise<{ keys: JWK[] }> {
    const key = await importSPKI(
      this.configService.getOrThrow<string>(ENV.JWT_PUBLIC_KEY),
      'RS256',
    );
    const jwk = await exportJWK(key);

    const fullJWK: JWK = {
      ...jwk,
      use: 'sig',
      alg: 'RS256',
      key_ops: ['verify'],
      kid: this.configService.getOrThrow<string>(ENV.JWT_KEY_ID),
    };

    return { keys: [fullJWK] };
  }
}
