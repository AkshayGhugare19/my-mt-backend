import { OnEvents } from '@common/decorators/on-events.decorator';
import { EventNamespace } from '@infrastructure/event/namespace';
import { UserDepositEvent } from '@modules/transaction-ledger/event/user-deposit.event';
import { Injectable, Logger } from '@nestjs/common';
import { GamanzaEngageService } from './service/gamanza-engage.service';
import { GameTransactionStatus, MoneyTransactionStatus } from './service/params';
import { MasterTokenIssueEvent } from '@modules/transaction-ledger/event/master-token-issue.event';
import { BetSettledEvent } from '@modules/bet/event/bet-settled.event';
import { BetPlacedEvent } from '@modules/bet/event/bet-placed.event';
import { EvenbetCreditEvent, EvenbetDebitEvent, UserLoginEvent, UserLogoutEvent } from '@infrastructure/event/classes';
import { decimalToDollarsValue } from '@utils/decimal-to-dollar-value';
import { BalanceService } from '@modules/balance/service/balance.service';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { decimalToNumber } from '@utils/decimal-do-number';
import { BetProviders } from '@modules/bet/enum/bet-providers.enum';

function providerNameToId(provider: string): string {
  return provider
    .split(' ')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .map((x) => x.toLowerCase())
    .join('_');
}

@Injectable()
export class GamanzaEngageEvents {
  private readonly logger: Logger;

  constructor(
    private readonly gamanzaEngageApi: GamanzaEngageService,
    private readonly balanceService: BalanceService,
    private readonly prismaService: PrismaService,
  ) {
    this.logger = new Logger(GamanzaEngageEvents.name);
  }

  private formatMoneyTransactionStatus(status: string): MoneyTransactionStatus {
    // if (['APPROVED', 'SUCCESS'].includes(status)) {
    //   return 'APPROVED';
    // }

    // if (['PENDING', 'WAITING_FINAL_APPROVAL'].includes(status)) {
    //   return 'PENDING';
    // }

    // return 'REJECTED';

    return 'APPROVED';
  }

  private formatGameTransactionStatus(status: string): GameTransactionStatus {
    // if (['WIN', 'DEBIT', 'LOSS', 'PE'].includes(status)) {
    //   return 'APPROVED';
    // }

    // if (status === 'ABORT') {
    //   return 'REJECTED';
    // }

    // return status as GameTransactionStatus;

    return 'APPROVED';
  }

  @OnEvents([EventNamespace.USER_DEPOSIT])
  async handeDepositEvent(event: UserDepositEvent): Promise<void> {
    this.logger.log({
      message: 'Gamanza Engage deposit event handler called.',
      event,
    });

    if (!event.userId) {
      return;
    }

    const currentDate = new Date().toISOString();

    const usdAmount = decimalToDollarsValue(event.pointsAmount);
    const usdBalance = decimalToDollarsValue(event.balance);

    await this.gamanzaEngageApi.sendMoneyTransactionEvent({
      playerId: event.userId,
      transactionId: randomUUID(),
      transactionType: 'DEPOSIT',
      amount: usdAmount,
      date: currentDate,
      currency: 'USD',
      transactionStatus: this.formatMoneyTransactionStatus(event.status),
      exchangeRate: 1,
      realMoneyBalance: usdBalance,
      bonusMoneyBalance: 0,
    });
  }

  @OnEvents([EventNamespace.USER_WITHDRAWAL])
  async handeWithdrawalEvent(event: MasterTokenIssueEvent): Promise<void> {
    this.logger.log({
      message: 'Gamanza Engage withdrawal event handler called.',
      event,
    });

    if (!event.userId) {
      return;
    }

    const currentDate = new Date().toISOString();

    const usdAmount = decimalToDollarsValue(event.amount);
    const usdBalance = decimalToDollarsValue(event.balance);

    await this.gamanzaEngageApi.sendMoneyTransactionEvent({
      playerId: event.userId,
      transactionId: randomUUID(),
      transactionType: 'WITHDRAW',
      amount: usdAmount,
      date: currentDate,
      currency: 'USD',
      transactionStatus: this.formatMoneyTransactionStatus(event.status),
      exchangeRate: 1,
      realMoneyBalance: usdBalance,
      bonusMoneyBalance: 0,
    });
  }

  private async handleSportsExchange(
    event: BetSettledEvent,
    usdBalance: number,
    usdAmount: number,
    currentDate: string,
  ): Promise<void> {
    return this.gamanzaEngageApi.sendSportTransactionEvent({
      playerId: event.userId,
      transactionId: randomUUID(),
      realMoneyBalance: usdBalance,
      date: currentDate,
      realMoneyAmount: usdAmount,
      transactionType: 'SETTLEMENT',
      transactionStatus: 'APPROVED',
      currency: 'USD',
      bet: [],
      exchangeRate: 1,
      bonusMoneyAmount: 0,
      bonusMoneyBalance: 0,
    });
  }

  private async handleSlotegratorGamesWin(
    event: BetSettledEvent,
    bet: any,
    usdBalance: number,
    currentDate: string,
  ): Promise<void> {
    const gameBet = bet.SlotegratorGameBets[0];
    if (!gameBet) {
      return;
    }
    const realMoneyAmount = Number(event.amount) > 0 ? decimalToNumber(event.amount) : 0;
    return this.gamanzaEngageApi.sendGameTransactionEvent({
      gameTransactionRound: [
        {
          playerId: event.userId,
          transactionId: randomUUID(),
          date: currentDate,
          realMoneyAmount,
          realMoneyBalance: usdBalance,
          transactionStatus: this.formatGameTransactionStatus(event.status),
          transactionType: 'WIN',
          betAmount: decimalToNumber(event.metadata?.placeBet?.amount),
          currency: 'USD',
          exchangeRate: 1,
          bonusMoneyAmount: 0,
          bonusMoneyBalance: 0,
          gameCategoryId: gameBet.game.gameCategory?.id ?? '6',
          gameCategoryName: gameBet.game.gameCategory?.name ?? 'other',
          gameProviderId: providerNameToId(gameBet.game.provider),
          gameProviderName: gameBet.game.provider,
          gameId: gameBet.gameId,
          gameName: gameBet.game.name,
          gameSessionId: gameBet.sessionId ?? randomUUID(),
        },
      ],
    });
  }

  private async handleSportsbookSettlement(
    event: BetSettledEvent,
    usdBalance: number,
    currentDate: string,
    bet: any,
  ): Promise<void> {
    return this.gamanzaEngageApi.sendSportTransactionEvent({
      playerId: event.userId,
      transactionId: bet?.metadata?.settleBet?.transactionId,
      transactionIdReference: bet?.metadata?.placeBet?.transactionId,
      realMoneyBalance: usdBalance,
      date: currentDate,
      realMoneyAmount: decimalToNumber(event.grossAmount),
      transactionType: bet?.status === 'CASH_OUT' ? 'CASHOUT' : 'SETTLEMENT',
      transactionStatus: 'APPROVED',
      currency: 'USD',
      bet:
        bet?.metadata?.placeBet?.betslip?.items?.map((item: any) => ({
          eventName: Array.isArray(item?.parameters?.competitor_name)
            ? item.parameters.competitor_name.join(' - ')
            : '',
          teams: item?.parameters?.competitor_name,
          market: item?.parameters?.market_name,
          matchDate: new Date().toISOString(),
          sportName: item?.parameters?.sport_name,
          tournamentName: item?.parameters?.tournament_name,
          odds: parseFloat(item?.parameters?.odds ?? '0'),
          outcomes: [
            {
              criterial: item?.parameters?.market_name,
              outcome: item?.parameters?.outcome_name,
            },
          ],
        })) ?? [],
      exchangeRate: 1,
      bonusMoneyAmount: 0,
      bonusMoneyBalance: 0,
    });
  }

  @OnEvents([EventNamespace.BET_SETTLED])
  async handleBetSettled(event: BetSettledEvent): Promise<void> {
    this.logger.log({
      message: 'Gamanza Engage bet settled event handler called.',
      event,
    });

    if (!event.userId || event.grossAmount?.lt(0)) {
      return;
    }

    const balance = await this.balanceService.getBalanceAndBonusBalance(event.userId);
    if (!balance) {
      return;
    }
    const usdBalance = decimalToDollarsValue(balance);

    const bet = await this.prismaService.bet.findUnique({
      where: {
        id: event.betId,
      },
      include: {
        SlotegratorGameBets: {
          include: {
            game: {
              include: {
                gameCategory: true,
              },
            },
          },
        },
      },
    });
    if (!bet) {
      return;
    }

    const currentDate = new Date().toISOString();

    const usdAmount = decimalToDollarsValue(event.grossAmount?.abs()) ?? 0;

    switch (event.provider) {
      case 'SPORTS_EXCHANGE':
        return this.handleSportsExchange(event, usdBalance, usdAmount, currentDate);
      case 'SLOTEGRATOR_GAMES':
        return this.handleSlotegratorGamesWin(event, bet, usdBalance, currentDate);
      case BetProviders.SLOTEGRATOR_SPORTSBOOK:
        return this.handleSportsbookSettlement(event, usdBalance, currentDate, bet);
    }
  }

  @OnEvents([EventNamespace.BET_PLACED])
  async handleBetPlaced(event: BetPlacedEvent): Promise<void> {
    this.logger.log({
      message: 'Gamanza Engage bet placed event handler called.',
      event,
    });

    if (event.amount?.lt(0)) {
      return;
    }

    const balance = await this.balanceService.getBalanceAndBonusBalance(event.userId);
    if (!balance) {
      return;
    }
    const usdBalance = decimalToDollarsValue(balance);

    this.logger.log({
      message: 'Gamanza Engage sportsbook bet placed, before bet ...',
    });

    const bet = await this.prismaService.bet.findUnique({
      where: {
        id: event.betId,
      },
      include: {
        SlotegratorGameBets: {
          include: {
            game: {
              include: {
                gameCategory: true,
              },
            },
          },
        },
      },
    });
    if (!bet) {
      return;
    }

    this.logger.log({
      message: 'Gamanza Engage sportsbook bet placed, after bet ...',
      bet,
    });

    const currentDate = new Date().toISOString();

    const usdAmount = decimalToDollarsValue(event.amount);

    switch (event.provider) {
      case 'SPORTS_EXCHANGE':
        await this.sendSportTransaction(event.userId, usdBalance, usdAmount, currentDate, []);
        break;

      case 'SLOTEGRATOR_GAMES':
        await this.handleSlotegratorGamesBet(event, bet, usdBalance, currentDate);
        break;

      case BetProviders.SLOTEGRATOR_SPORTSBOOK:
        await this.handleSportsbookBet(event, usdBalance, currentDate, bet);
        break;

      default:
        this.logger.warn({ message: 'Unknown provider in handleBetPlaced', provider: event.provider });
        break;
    }
  }

  private async sendSportTransaction(
    userId: string,
    usdBalance: number,
    usdAmount: number,
    date: string,
    bets: any[],
  ): Promise<void> {
    await this.gamanzaEngageApi.sendSportTransactionEvent({
      playerId: userId,
      transactionId: randomUUID(),
      realMoneyBalance: usdBalance,
      date,
      realMoneyAmount: usdAmount,
      transactionType: 'BET',
      transactionStatus: 'APPROVED',
      currency: 'USD',
      bet: bets,
      exchangeRate: 1,
      bonusMoneyAmount: 0,
      bonusMoneyBalance: 0,
    });
  }

  private async handleSlotegratorGamesBet(
    event: BetPlacedEvent,
    bet: any,
    usdBalance: number,
    date: string,
  ): Promise<void> {
    const gameBet = bet.SlotegratorGameBets[0];
    if (!gameBet) {
      return;
    }

    await this.gamanzaEngageApi.sendGameTransactionEvent({
      gameTransactionRound: [
        {
          playerId: event.userId,
          transactionId: randomUUID(),
          date,
          realMoneyAmount: decimalToNumber(event.amount),
          realMoneyBalance: usdBalance,
          transactionStatus: this.formatGameTransactionStatus(event.status),
          transactionType: 'BET',
          betAmount: decimalToNumber(event.amount),
          currency: 'USD',
          exchangeRate: 1,
          bonusMoneyAmount: 0,
          bonusMoneyBalance: 0,
          gameCategoryId: gameBet.game.gameCategory?.id ?? '6',
          gameCategoryName: gameBet.game.gameCategory?.name ?? 'Other',
          gameProviderId: providerNameToId(gameBet.game.provider),
          gameProviderName: gameBet.game.provider,
          gameId: gameBet.gameId,
          gameName: gameBet.game.name,
          gameSessionId: gameBet.sessionId ?? randomUUID(),
        },
      ],
    });
  }

  private async handleSportsbookBet(event: BetPlacedEvent, usdBalance: number, date: string, bet: any): Promise<void> {
    const bets = (bet?.metadata?.placeBet?.betslip?.items ?? []).map((item: any) => ({
      eventName: Array.isArray(item?.parameters?.competitor_name) ? item.parameters.competitor_name.join(' - ') : '',
      teams: item?.parameters?.competitor_name,
      market: item?.parameters?.market_name,
      matchDate: new Date().toISOString(),
      sportName: item?.parameters?.sport_name,
      tournamentName: item?.parameters?.tournament_name,
      odds: parseFloat(item?.parameters?.odds ?? '0'),
      outcomes: [
        {
          criterial: item?.parameters?.market_name,
          outcome: item?.parameters?.outcome_name,
        },
      ],
    }));

    await this.gamanzaEngageApi.sendSportTransactionEvent({
      playerId: event.userId,
      transactionId: bet?.metadata?.placeBet?.transactionId,
      realMoneyAmount: decimalToNumber(event.amount)!,
      bonusMoneyAmount: 0,
      realMoneyBalance: usdBalance,
      bonusMoneyBalance: 0,
      currency: 'USD',
      exchangeRate: 1,
      date,
      transactionType: 'BET',
      transactionStatus: 'APPROVED',
      bet: bets,
    });
  }

  @OnEvents([EventNamespace.EVENBET_CREDIT, EventNamespace.EVENBET_DEBIT])
  async handleEvenbetEvents(event: EvenbetCreditEvent | EvenbetDebitEvent): Promise<void> {
    this.logger.log({
      message: 'Gamanza Engage poker event handler called.',

      event,
    });

    if (!event.userId || event.amount?.lt(0)) {
      return;
    }

    const currentDate = new Date().toISOString();

    const usdAmount = decimalToDollarsValue(event.amount);
    const usdNewBalance = decimalToDollarsValue(event.newBalance);

    this.gamanzaEngageApi.sendGameTransactionEvent({
      gameTransactionRound: [
        {
          playerId: event.userId,
          transactionId: randomUUID(),
          date: currentDate,
          realMoneyAmount: usdAmount,
          transactionStatus: 'APPROVED',
          transactionType: event instanceof EvenbetCreditEvent ? 'WIN' : 'BET',
          betAmount: usdAmount,
          currency: 'USD',
          gameCategoryId: '5',
          gameCategoryName: 'poker',
          gameProviderId: 'evenbet',
          gameProviderName: 'Evenbet',
          gameId: 'poker',
          gameName: 'Poker',
          gameSessionId: event.transactionId,

          bonusMoneyAmount: 0,
          exchangeRate: 1,
          realMoneyBalance: usdNewBalance,
          bonusMoneyBalance: 0,
        },
      ],
    });
  }

  @OnEvents([EventNamespace.USER_LOGIN])
  async handleUserLogin(event: UserLoginEvent): Promise<void> {
    this.logger.log({
      message: 'Gamanza Engage user login event handler called.',
      event,
    });

    if (!event.playerId) {
      return;
    }

    await this.gamanzaEngageApi.gamanzaLoginPlayer({
      playerId: event.playerId,
      date: event.date,
    });
  }

  @OnEvents([EventNamespace.USER_LOGOUT])
  async handleUserLogout(event: UserLogoutEvent): Promise<void> {
    this.logger.log({
      message: 'Gamanza Engage user logout event handler called.',
      event,
    });

    if (!event.playerId) {
      return;
    }

    await this.gamanzaEngageApi.gamanzaLogoutPlayer({
      playerId: event.playerId,
      date: event.date,
    });
  }
}
