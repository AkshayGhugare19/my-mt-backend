import { Public } from '@common/decorators/public-route.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { LoginResponseDto } from '@modules/authentication/core/dto/login-response.dto';
import { LoginDto } from '@modules/authentication/core/dto/login.dto';
import { RefreshTokenDto } from '@modules/authentication/core/dto/refresh-token-dto';
import { AdminAuthService } from '@modules/authentication/credentials/service/admin-auth.service';
import { AuthService } from '@modules/authentication/core/service/auth.service';
import { JwtPayload } from '@modules/authentication/types';
import {
  allOf,
  RequirePermissions,
} from '@modules/permission/decorator/require-permissions.decorator';
import { UserDto } from '@modules/user/dto/user.dto';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Authentication Admin')
@Controller('auth/admin')
export class AdminCredentialsAuthController {
  constructor(
    private readonly authenticationService: AuthService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  @Public()
  @Post('/login')
  @HttpCode(HttpStatus.OK)
  @ApiCreatedResponse({
    type: LoginResponseDto,
  })
  async adminLogin(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const loginResponse = await this.adminAuthService.login(
      loginDto.username,
      loginDto.password,
      loginDto.twoFactorAuthenticationCode,
    );
    return {
      refreshToken: loginResponse.refreshToken,
      token: loginResponse.token,
      user: UserDto.fromUser(loginResponse.user),
    };
  }

  @Post('logout')
  @RequirePermissions('admin', allOf())
  @HttpCode(200)
  async logOutAdmin(@UserContext() { sub }: JwtPayload): Promise<void> {
    await this.authenticationService.logOut(sub, 'admin');
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiCreatedResponse({
    type: RefreshTokenDto,
  })
  async refreshTokenAdmin(
    @Body() { refreshToken }: RefreshTokenDto,
  ): Promise<Omit<LoginResponseDto, 'user'>> {
    const data = await this.authenticationService.refreshToken(
      refreshToken,
      'admin',
    );
    return {
      token: data.token,
      refreshToken: data.refreshToken,
    };
  }
}
