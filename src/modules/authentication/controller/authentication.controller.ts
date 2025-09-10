import { Public } from '@common/decorators/public-route.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { LoginResponseDto } from '@modules/authentication/core/dto/login-response.dto';
import { JwtPayload } from '@modules/authentication/types';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from '@modules/authentication/core/service/auth.service';
import { RefreshTokenDto } from '@modules/authentication/core/dto/refresh-token-dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { RegisterDto } from '../core/dto/register.dto';

@Controller('auth')
@ApiTags('Authentication')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthService) {}

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logOut(@UserContext() { sub }: JwtPayload): Promise<void> {
    await this.authenticationService.logOut(sub, 'client');
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCreatedResponse({
    type: LoginResponseDto,
  })
  async refreshToken(
    @Body() { refreshToken }: RefreshTokenDto,
  ): Promise<Omit<LoginResponseDto, 'user'>> {
    const data = await this.authenticationService.refreshToken(
      refreshToken,
      'client',
    );
    return {
      token: data.token,
      refreshToken: data.refreshToken,
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerUserDto: RegisterDto, @Headers('cf-ipcountry') countryCode?: string): Promise<any> {
    return await this.authenticationService.register({ ...registerUserDto, countryCode });
  }
}
