/* eslint-disable sonarjs/no-duplicate-string */
import { GamanzaEngageEvents } from '@external/gamanza-engage/gamanza-engage.events';
import { GamanzaEngageService } from '@external/gamanza-engage/service/gamanza-engage.service';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BalanceService } from '@modules/balance/service/balance.service';
import { BetPlacedEvent } from '@modules/bet/event/bet-placed.event';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { randomUUID } from 'crypto';

vi.mock('crypto', () => ({ randomUUID: vi.fn(() => '1223445') }));

const betMetadata = {
  placeBet: {
    amount: 9900,
    betslip: {
      // eslint-disable-next-line sonarjs/no-duplicate-string
      uuid: '674f9cf4-d50a-1944-37d9-800020000010',
      items: [
        {
          uuid: '674f9cf4-d5d7-1997-3692-800030000010',
          event_id: '2475494251622969373',
          parameters: {
            odds: '1.27',
            is_live: false,
            sport_id: '2',
            scheduled: 1733283000,
            sport_name: 'Basketball',
            category_id: '1669819088232386560',
            // eslint-disable-next-line sonarjs/no-duplicate-string
            market_name: 'Winner (incl. overtime)',
            // eslint-disable-next-line sonarjs/no-duplicate-string
            outcome_name: 'LA Clippers',
            category_name: 'USA',
            tournament_id: '1669819088278523904',
            competitor_name: ['LA Clippers', 'Portland Trail Blazers'],
            tournament_name: 'NBA',
          },
        },
        {
          uuid: '674f9cf4-d5fb-1946-348f-800030000010',
          event_id: '2475494251622969393',
          parameters: {
            odds: '1.53',
            is_live: false,
            sport_id: '2',
            scheduled: 1733275800,
            sport_name: 'Basketball',
            category_id: '1669819088232386560',
            market_name: 'Winner (incl. overtime)',
            // eslint-disable-next-line sonarjs/no-duplicate-string
            outcome_name: 'Dallas Mavericks',
            category_name: 'USA',
            tournament_id: '1669819088278523904',
            competitor_name: ['Dallas Mavericks', 'Memphis Grizzlies'],
            tournament_name: 'NBA',
          },
        },
        {
          uuid: '674f9cf4-d612-1927-30e2-800030000010',
          event_id: '2475433934012424233',
          parameters: {
            odds: '1.1',
            is_live: false,
            sport_id: '2',
            scheduled: 1733274000,
            sport_name: 'Basketball',
            category_id: '1669819088232386560',
            market_name: 'Winner (incl. overtime)',
            // eslint-disable-next-line sonarjs/no-duplicate-string
            outcome_name: 'Oklahoma City Thunder',
            category_name: 'USA',
            tournament_id: '1669819088278523904',
            competitor_name: ['Oklahoma City Thunder', 'Utah Jazz'],
            tournament_name: 'NBA',
          },
        },
      ],
      amount: 9900,
      status: 'open',
      currency: 'USD',
      parameters: {
        type: '3/3',
        timestamp: 1733270772.028,
        total_odds: '2.13741',
        is_quick_bet: false,
        potential_win: 21160.36,
        potential_comboboost_win: 0,
      },
      provider_betslip_id: '2475882723026280868',
    },
    currency: 'USD',
    playerId: 'cm47afawh08e4a4eop95x38zz',
    betslipId: '674f9cf4-d50a-1944-37d9-800020000010',
    sessionId: 'e1c8e6d4-5320-453f-bf6d-b5fc9ee961af',
    transactionId: '674f9cf4-d660-1916-3d6e-800010000010',
    sportsbookUuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
  },
  bonusUsed: [],
  settleBet: {
    amount: 21160.36,
    betslip: {
      uuid: '674f9cf4-d50a-1944-37d9-800020000010',
      items: [
        {
          uuid: '674f9cf4-d5d7-1997-3692-800030000010',
          event_id: '2475494251622969373',
          parameters: {
            odds: '1.27',
            is_live: false,
            sport_id: '2',
            scheduled: 1733283000,
            sport_name: 'Basketball',
            category_id: '1669819088232386560',
            market_name: 'Winner (incl. overtime)',
            outcome_name: 'LA Clippers',
            category_name: 'USA',
            tournament_id: '1669819088278523904',
            competitor_name: ['LA Clippers', 'Portland Trail Blazers'],
            tournament_name: 'NBA',
          },
        },
        {
          uuid: '674f9cf4-d5fb-1946-348f-800030000010',
          event_id: '2475494251622969393',
          parameters: {
            odds: '1.53',
            is_live: false,
            sport_id: '2',
            scheduled: 1733275800,
            sport_name: 'Basketball',
            category_id: '1669819088232386560',
            market_name: 'Winner (incl. overtime)',
            outcome_name: 'Dallas Mavericks',
            category_name: 'USA',
            tournament_id: '1669819088278523904',
            competitor_name: ['Dallas Mavericks', 'Memphis Grizzlies'],
            tournament_name: 'NBA',
          },
        },
        {
          uuid: '674f9cf4-d612-1927-30e2-800030000010',
          event_id: '2475433934012424233',
          parameters: {
            odds: '1.1',
            is_live: false,
            sport_id: '2',
            scheduled: 1733274000,
            sport_name: 'Basketball',
            category_id: '1669819088232386560',
            market_name: 'Winner (incl. overtime)',
            outcome_name: 'Oklahoma City Thunder',
            category_name: 'USA',
            tournament_id: '1669819088278523904',
            competitor_name: ['Oklahoma City Thunder', 'Utah Jazz'],
            tournament_name: 'NBA',
          },
        },
      ],
      amount: 9900,
      status: 'open',
      currency: 'USD',
      provider_betslip_id: '2475882723026280868',
    },
    currency: 'USD',
    playerId: 'cm47afawh08e4a4eop95x38zz',
    betslipId: '674f9cf4-d50a-1944-37d9-800020000010',
    sessionId: 'e1c8e6d4-5320-453f-bf6d-b5fc9ee961af',
    transactionId: '674fed05-9eb7-1807-3200-8000100000ef',
    sportsbookUuid: 'd595248f-75ff-454b-8d6d-e6a232dff199',
  },
};

describe('GamanzaEngageEvent', () => {
  let gamanzaEngageEvent: GamanzaEngageEvents;
  const gamanzaEngageService: GamanzaEngageService = {
    sendSportTransactionEvent: vi.fn(),
  } as unknown as GamanzaEngageService;

  beforeEach(() => {
    gamanzaEngageEvent = new GamanzaEngageEvents(gamanzaEngageService, {} as BalanceService, {} as PrismaService);
  });

  test('handleSportsbookBet', async () => {
    const betData = { metadata: betMetadata };
    const event = {
      userId: 'cm47afawh08e4a4eop95x38zz',
      transactionId: '674f9cf4-d660-1916-3d6e-800010000010',
      amount: new Decimal(9900),
    } as BetPlacedEvent;
    const usdBalance = 100;
    const date = new Date().toISOString();

    const expectedBets = [
      {
        eventName: 'LA Clippers - Portland Trail Blazers',
        market: 'Winner (incl. overtime)',
        matchDate: new Date().toISOString(),
        teams: ['LA Clippers', 'Portland Trail Blazers'],
        sportName: 'Basketball',
        tournamentName: 'NBA',
        odds: 1.27,
        outcomes: [
          {
            criterial: 'LA Clippers',
            outcome: 'LA Clippers',
          },
        ],
      },
      {
        eventName: 'Dallas Mavericks - Memphis Grizzlies',
        market: 'Winner (incl. overtime)',
        matchDate: new Date().toISOString(),
        teams: ['Dallas Mavericks', 'Memphis Grizzlies'],
        sportName: 'Basketball',
        tournamentName: 'NBA',
        odds: 1.53,
        outcomes: [
          {
            criterial: 'Dallas Mavericks',
            outcome: 'Dallas Mavericks',
          },
        ],
      },
      {
        eventName: 'Oklahoma City Thunder - Utah Jazz',
        market: 'Winner (incl. overtime)',
        matchDate: new Date().toISOString(),
        teams: ['Oklahoma City Thunder', 'Utah Jazz'],
        sportName: 'Basketball',
        tournamentName: 'NBA',
        odds: 1.1,
        outcomes: [
          {
            criterial: 'Oklahoma City Thunder',
            outcome: 'Oklahoma City Thunder',
          },
        ],
      },
    ];

    // eslint-disable-next-line dot-notation
    await gamanzaEngageEvent['handleSportsbookBet'](event, usdBalance, date, betData);

    expect(gamanzaEngageService.sendSportTransactionEvent).toHaveBeenCalledWith({
      playerId: event.userId,
      transactionId: event.transactionId || randomUUID(),
      realMoneyAmount: decimalToNumber(event.amount),
      bonusMoneyAmount: 0,
      realMoneyBalance: usdBalance,
      bonusMoneyBalance: 0,
      currency: 'USD',
      exchangeRate: 1,
      date,
      transactionType: 'BET',
      transactionStatus: 'APPROVED',
      bet: expectedBets,
    });
  });
});
