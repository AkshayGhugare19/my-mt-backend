import { Public } from '@common/decorators/public-route.decorator';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { LoginResponseDto } from '@modules/authentication/core/dto/login-response.dto';
import {
  Web3AuthLoginBody,
  Web3AuthLoginDto,
} from '@modules/authentication/web3auth/dto/web3auth-login.dto';
import { Web3AuthPayloadTypes } from '@modules/authentication/web3auth/enum/payload-type.enum';
import { Web3AuthGuard } from '@modules/authentication/web3auth/guards/web3auth.guard';
import { Web3AuthService } from '@modules/authentication/web3auth/service/web3auth.service';
import { UserDto } from '@modules/user/dto/user.dto';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Authentication Web3Auth')
@Controller('auth/web3')
export class Web3AuthController {
  constructor(private readonly web3AuthService: Web3AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SkipResponseFormatting()
  @ApiCreatedResponse({
    type: LoginResponseDto,
  })
  @ApiBody({ type: Web3AuthLoginBody })
  @UseGuards(Web3AuthGuard)
  async authWithWeb3(
    @Body() loginDto: Web3AuthLoginDto,
  ): Promise<LoginResponseDto> {
    if (loginDto.jwtPayload.type === Web3AuthPayloadTypes.SOCIALS && !loginDto.authValidation.allWalletsWithSignatures) {
      throw new BadRequestException(ErrorMessages.INVALID_LOGIN_SIGNATURE);
    }
    const loginResponse = await this.web3AuthService.walletLogin(loginDto);

    return new LoginResponseDto({
      token: loginResponse.token,
      user: UserDto.fromUser(loginResponse.user),
      refreshToken: loginResponse.refreshToken,
    });
  }

  @Post('session')
  @HttpCode(HttpStatus.OK)
  async generateWeb3AuthLoginSession(
    @UserContext('sub') userId: string,
  ): Promise<Pick<LoginResponseDto, 'token'>> {
    const loginResponse = await this.web3AuthService.generateLoginToken(userId);

    return {
      token: loginResponse,
    };
  }
}
