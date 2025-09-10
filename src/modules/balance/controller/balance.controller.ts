import { Public } from '@common/decorators/public-route.decorator';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { ENV } from '@common/env';
import { JwtPayload } from '@modules/authentication/types';
import { BalanceService } from '@modules/balance/service/balance.service';
import { BonusBalanceService } from '@modules/bonus/service/bonus-balance.service';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';

@Controller('balance')
export class BalanceController {
  constructor(
    private readonly balanceService: BalanceService,
    private readonly bonusBalanceService: BonusBalanceService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @SkipResponseFormatting()
  async getBalance(@UserContext() { sub }: JwtPayload): Promise<{
    balance: number;
    bonusBalance: number;
    usdBalance: number;
    usdBonusBalance: number;
  }> {
    const balance = await this.balanceService.getBalance(sub);
    const bonusBalance =
      await this.bonusBalanceService.getUserBonusBalanceById(sub);
    return {
      balance: decimalToNumber(balance) || 0,
      usdBalance: parseFloat(
        new Decimal(balance || 0)
          .div(this.configService.getOrThrow(ENV.USD_POINTS))
          .toFixed(2),
      ),
      bonusBalance: decimalToNumber(bonusBalance) || 0,
      usdBonusBalance: parseFloat(
        new Decimal(bonusBalance || 0)
          .div(this.configService.getOrThrow(ENV.USD_POINTS))
          .toFixed(2),
      ),
    };
  }

  @Get('/points-conversion-rate')
  async getConversionRate(): Promise<{ conversionRate: number }> {
    return {
      conversionRate: this.configService.getOrThrow(ENV.USD_POINTS),
    };
  }

  @Get('exchange-rate')
  async getExchangeRates(): Promise<{
    solUsdt: string | null;
    ethUsdt: string | null;
    trxUsdt: string | null;
    solUsdc: string | null;
    ethUsdc: string | null;
    trxUsdc: string | null;
  }> {
    return this.balanceService.getExchangeRates();
  }

  @Public()
  @Get('widget/exchange-rates')
  async getWidgetExchangeRates(): Promise<{
    usdtUsd: string | null;
    usdtEur: string | null;
    usdtPhp: string | null;
    usdcUsd: string | null;
    usdcEur: string | null;
    usdcPhp: string | null;
  }> {
    return this.balanceService.getWidgetExchangeRates();
  }
}
