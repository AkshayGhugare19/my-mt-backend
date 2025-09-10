import { Public } from '@common/decorators/public-route.decorator';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { FungamessBlacklistGuard } from '@modules/authentication/core/guards/blacklist.guard';
import { JwtPayload } from '@modules/authentication/types';
import { BalanceService } from '@modules/balance/service/balance.service';
import { FungamessJwtAuthGuard } from '@modules/betting-providers/fungamess/auth/fungamess-jwt-auth.guard';
import { FungamessSignatureGuard } from '@modules/betting-providers/fungamess/auth/fungamess-signature-auth.guard';

import { FungamessException } from '@modules/betting-providers/fungamess/error/fungamess.error';
import { FungamessRefreshTokenInterceptor } from '@modules/betting-providers/fungamess/interceptors/refresh-token.interceptor';
import { GetUserTokenQuery } from '@modules/betting-providers/fungamess/query/get-user-token.query';
import { FungamessService } from '@modules/betting-providers/fungamess/service/fungamess.service';
import {
  FungamessBalanceResponse,
  FungamessJwtPayload,
  FungamessResponse,
} from '@modules/betting-providers/fungamess/types';
import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  Logger,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';

@Controller('fungamess')
export class FungamessController {
  private readonly logger = new Logger(FungamessController.name);
  constructor(
    private readonly fungamessService: FungamessService,
    private readonly balanceService: BalanceService,
  ) {}

  @Post('create-session')
  @SkipResponseFormatting()
  async createSession(
    @UserContext() { sub }: JwtPayload,
  ): Promise<{ token: string }> {
    return this.fungamessService.createSession(sub);
  }

  @Public()
  @Get('sessionCheck')
  @UseGuards(
    FungamessSignatureGuard,
    FungamessJwtAuthGuard,
    FungamessBlacklistGuard,
  )
  @UseInterceptors(FungamessRefreshTokenInterceptor)
  @SkipResponseFormatting()
  async sessionCheck(
    @UserContext() user: FungamessJwtPayload,
    @Query('userId') playerTag: string,
  ): Promise<FungamessResponse> {
    if (!user?.playerTag || playerTag !== user.playerTag) {
      this.logger.error(
        {
          message: 'Invalid playerTag',
          playerTag,
          user,
        },
        'sessionCheck',
      );
      throw new FungamessException(new HttpException('Token not found', 417));
    }
    try {
      const response = await this.fungamessService.sessionCheck(
        user?.playerTag,
      );
      return {
        status: response,
      };
    } catch (error) {
      throw new FungamessException(error);
    }
  }

  @Public()
  @Get('playerDetails')
  @UseGuards(
    FungamessSignatureGuard,
    FungamessJwtAuthGuard,
    FungamessBlacklistGuard,
  )
  @SkipResponseFormatting()
  async playerDetails(
    @UserContext() { playerTag }: FungamessJwtPayload,
  ): Promise<FungamessResponse> {
    try {
      return await this.fungamessService.playerDetails(playerTag);
    } catch (error) {
      throw new FungamessException(error);
    }
  }

  @Public()
  @Get('getBalance')
  @UseGuards(
    FungamessSignatureGuard,
    FungamessJwtAuthGuard,
    FungamessBlacklistGuard,
  )
  @SkipResponseFormatting()
  async getBalance(
    @UserContext() { playerTag }: FungamessJwtPayload,
  ): Promise<FungamessResponse<FungamessBalanceResponse>> {
    try {
      const balanceResponse =
        await this.fungamessService.getPlayerBalance(playerTag);
      return {
        status: balanceResponse.status,
        balance: decimalToNumber(
          this.fungamessService.convertPointsToUsd(balanceResponse.balance),
        ),
      };
    } catch (error) {
      throw new FungamessException(error);
    }
  }

  @Public()
  @Get('getUserToken')
  @HttpCode(200)
  @UseGuards(FungamessSignatureGuard)
  @SkipResponseFormatting()
  async getUserToken(
    @Query() { userId }: GetUserTokenQuery,
  ): Promise<
    FungamessResponse<
      FungamessBalanceResponse & { token: string; userId: string }
    >
  > {
    const session = await this.fungamessService.getSessionByPlayerTag(userId);
    if (!session || !session.token) {
      throw new FungamessException(new HttpException('Token not found', 417));
    }
    const balance = await this.balanceService.getBalanceAndBonusBalance(userId);
    return {
      status: true,
      token: session.token,
      userId,
      balance: decimalToNumber(
        this.fungamessService.convertPointsToUsd(balance || new Decimal(0)),
      ),
    };
  }
}
