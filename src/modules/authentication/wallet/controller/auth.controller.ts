import { Public } from '@common/decorators/public-route.decorator';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { LoginResponseDto } from '@modules/authentication/core/dto/login-response.dto';
import { GenerateNonceDto } from '@modules/authentication/wallet/dto/generate-nonce.dto';
import { WalletLoginDto } from '@modules/authentication/wallet/dto/wallet-login.dto';
import { OptionalJwtGuard } from '@modules/authentication/core/guards/optional-jwt.guard';
import { JwtPayload } from '@modules/authentication/types';
import { WalletAuthService } from '@modules/authentication/wallet/service/wallet-auth.service';
import { UserDto } from '@modules/user/dto/user.dto';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Authentication Wallet')
@Controller('auth/wallet')
export class WalletAuthController {
  constructor(private readonly walletAuthService: WalletAuthService) {}

  @Public()
  @Put('login/nonce')
  @SkipResponseFormatting()
  @ApiCreatedResponse({
    type: LoginResponseDto,
  })
  async generateNonce(
    @Body() { walletAddress }: GenerateNonceDto,
  ): Promise<{ nonce: string; expiresAt: Date }> {
    return this.walletAuthService.getNonce(walletAddress);
  }

  @Public()
  @Post('login')
  @SkipResponseFormatting()
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtGuard)
  @ApiCreatedResponse({
    type: LoginResponseDto,
  })
  async walletLogin(
    @UserContext() userCtx: JwtPayload,
    @Body() params: WalletLoginDto,
  ): Promise<LoginResponseDto> {
    const { signature, walletAddress, partnerMatrixBtag } = params;
    const loginResponse =
      await this.walletAuthService.authenticateWalletBySignature(
        {
          wallet: walletAddress,
          signature,
          userId: userCtx?.sub,
          partnerMatrixBtag,
          countryCode: params.countryCode,
        }
      );
    return new LoginResponseDto({
      token: loginResponse.token,
      user: UserDto.fromUser(loginResponse.user),
      refreshToken: loginResponse.refreshToken,
    });
  }
}
