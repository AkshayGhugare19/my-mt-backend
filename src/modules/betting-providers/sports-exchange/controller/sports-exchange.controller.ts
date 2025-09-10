import { Public } from '@common/decorators/public-route.decorator';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { ENV } from '@common/env';
import { BrokerMessage } from '@infrastructure/queue/rabbitmq/enum/message';
import { JwtPayload } from '@modules/authentication/types';
import { SportsExchangeAuthGuard } from '@modules/betting-providers/sports-exchange/auth/sports-exchange-auth.guard';
import { CreateSportsExchangeBetSchema } from '@modules/betting-providers/sports-exchange/dto/create-bet.dto';
import { GetBalanceDto } from '@modules/betting-providers/sports-exchange/dto/get-balance.dto';
import { SportsExchangeException } from '@modules/betting-providers/sports-exchange/error/sports-exchange.error';
import { SportsExchangeSerializableException } from '@modules/betting-providers/sports-exchange/interface/sports-exchange-serializable-exception.interface';
import { SportsExchangeService } from '@modules/betting-providers/sports-exchange/service/sports-exchange.service';
import {
  PlaceSportsExchangeBet,
  SportsExchangeResponse,
} from '@modules/betting-providers/sports-exchange/types';
import { UserBlacklistService } from '@modules/user/services/user-blacklist.service';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { Decimal } from '@prisma/client/runtime/library';

@Controller('/')
export class SportsExchangeController {
  private readonly logger = new Logger(SportsExchangeController.name);
  constructor(
    private readonly sportsExchangeService: SportsExchangeService,
    private readonly configService: ConfigService,
    private readonly userBlacklistService: UserBlacklistService,
  ) {}

  @MessagePattern(BrokerMessage.GET_BALANCE)
  async listenTest(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ): Promise<number> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    if (!data.userId) {
      channel.ack(originalMsg);
      return 0;
    }
    const balance = await this.sportsExchangeService.getBalance(data.userId);

    channel.ack(originalMsg);
    return balance.data?.balance || 0;
  }

  @Post('/v1/exchange/session')
  async createSession(
    @UserContext() userContext: JwtPayload,
    @Query('tab') tab?: string,
  ): Promise<{ url: string }> {
    const url = await this.sportsExchangeService.createSession(
      userContext.sub,
      tab,
    );
    return {
      url,
    };
  }

  @Public()
  @Post('/v1/exchange/demo/session')
  createDemoSession(@Query('tab') tab?: string): Promise<string> {
    return this.sportsExchangeService.createDemoSession(tab);
  }

  @Public()
  @HttpCode(200)
  @Post('/sports-exchange/:apiKey/api/v1/getBalance')
  @UseGuards(SportsExchangeAuthGuard)
  @SkipResponseFormatting()
  async getBalance(
    @Param('apiKey') apiKey: string,
    // eslint-disable-next-line camelcase
    @Body() { user_id }: GetBalanceDto,
  ): Promise<SportsExchangeResponse> {
    this.verifyApiKey(apiKey);
    await this.verifyBlacklistUser(user_id);
    try {
      // eslint-disable-next-line camelcase
      return await this.sportsExchangeService.getBalance(user_id);
    } catch (error) {
      throw new SportsExchangeException(error, user_id, 0);
    }
  }

  @Public()
  @HttpCode(200)
  @Post('/sports-exchange/:apiKey/api/v1/placeBet')
  @UseGuards(SportsExchangeAuthGuard)
  @SkipResponseFormatting()
  async placeBet(
    @Param('apiKey') apiKey: string,
    @Body() createSportsExchangeBody: unknown,
  ): Promise<SportsExchangeResponse> {
    this.verifyApiKey(apiKey);

    const parsedBody = CreateSportsExchangeBetSchema.safeParse(
      createSportsExchangeBody,
    );

    if (!parsedBody.success) {
      this.logger.warn(ErrorMessages.INVALID_REQUEST_BODY_SPORTS_EXCHANGE, {
        props: createSportsExchangeBody,
        error: parsedBody.error,
        context: ' SportsExchangeController.placeBet',
      });
      throw new SportsExchangeException(
        new BadRequestException(
          ErrorMessages.INVALID_REQUEST_BODY_SPORTS_EXCHANGE,
        ),
        (createSportsExchangeBody as any)?.user_id,
        0,
      );
    }

    await this.verifyBlacklistUser(parsedBody.data.user_id);

    try {
      const data = parsedBody.data;
      const placeSportsExchangeBetDto: PlaceSportsExchangeBet = {
        userId: data.user_id,
        amount: new Decimal(data.amount),
        backLay: data.back_lay,
        exposure: new Decimal(data.exposure),
        matchId: data.match_id,
        matchName: data.match_name,
        odds: data.odds,
        result: 'pending',
        roundId: data.round_id,
        roundName: data.round_name,
        selection: data.selection || undefined,
        size: data.size,
        sportId: data.sport_id,
        sportName: data.sport_name,
        transactionId: `${data.transation_id}`,
      };
      const balanceUpdate = await this.sportsExchangeService.placeBet(
        placeSportsExchangeBetDto,
      );
      return {
        message: 'Bet placed successfully',
        status: true,
        data: {
          balance: balanceUpdate.balance || 0,
          user_id: balanceUpdate.playerTag,
        },
      };
    } catch (error) {
      throw new SportsExchangeException(
        error,
        (error as SportsExchangeSerializableException).getPlayerTag() ||
          (createSportsExchangeBody as any)?.user_id,
        (error as SportsExchangeSerializableException).getBalance() || 0,
      );
    }
  }

  // eslint-disable-next-line camelcase
  public verifyApiKey(apiKey: string): void {
    const sportsExchangeApiKey = this.configService.get<string>(
      ENV.SPORTS_EXCHANGE_API_KEY,
    );
    if (apiKey !== sportsExchangeApiKey) {
      throw new UnauthorizedException();
    }
  }

  private async verifyBlacklistUser(playerTag: string): Promise<void> {
    const isBlacklisted =
      await this.userBlacklistService.isBlacklisted(playerTag);

    if (isBlacklisted) {
      throw new SportsExchangeException(
        new UnauthorizedException(ErrorMessages.USER_BLOCKED),
        playerTag,
      );
    }
  }
}
