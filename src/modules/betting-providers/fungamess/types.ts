import {
  FungamessEventType,
  FungamessEventTypes,
} from '@modules/betting-providers/fungamess/enum/event-types.enum';
import { Decimal } from '@prisma/client/runtime/library';

export type FungamessResponse<T = {}> = {
  status: boolean;
  errorDesc?: string;
  newToken?: string;
} & T;

export type FungamessJwtPayload = {
  sub: string;
  playerTag: string;
  exp: number;
};

export type FungamessRegisterPlayerResponse = {
  userId: string;
  nickname: string;
  currency: string; // USD EUR
  language: string; // en
};

export type FungamessBalanceResponse = {
  balance: number;
};

export type FungamessOptionalBalanceResponse = {
  balance?: number;
};

export type FungamessSportsBetsExtraData = {
  status: false | true;
  placedBetId: number;
  result: 'lose' | 'win' | 'half_win' | 'half_lose' | 'return' | 'cash_out';
};

export type FungamessBetMetadata<T = { gameId: string }> = {
  placeBet: T;
};

export type FungamessAggregateBetStatus = {
  isAggregate: boolean;
  canSettle: boolean;
  aggregateAmount: Decimal;
  status: FungamessEventType | null;
};

export type SportsbookBetslipBet = {
  odds: string;
  live: boolean;
  id: string;
  event_id: string;
  provider_uuid: string;
  sport_id: string;
  scheduled: number;
  sport_name: string;
  category_id: string;
  market_name: string;
  outcome_name: string;
  category_name: string;
  tournament_id: string;
  competitor_name: string[];
  tournament_name: string;
};

export type SportsbookBetslip = {
  k: string;
  id: string;
  sum: number;
  bets: SportsbookBetslipBet[];
  type: string;
  currency: string;
  player_id: string;
  timestamp: number;
  operator_id: string;
  is_quick_bet: boolean;
  ext_player_id: string;
  operator_brand_id: string;
};

export type SlotegratorSportsBookBetslipBet = {
  odds: string;
  is_live: boolean;
  sport_id: string;
  scheduled: number;
  sport_name: string;
  category_id: string;
  market_name: string;
  outcome_name: string;
  status: string;
  category_name: string;
  tournament_id: string;
  competitor_name: string[];
  tournament_name: string;
};

export type SlotegratorSportsBookBetslip = {
  uuid: string;
  items: {
    uuid: string;
    event_id: string;
    provider_uuid: string;
    status?: string;
    parameters: SlotegratorSportsBookBetslipBet;
  }[];
  amount: number;
  status: string;
  currency: string;
  parameters: {
    type: string;
    timestamp: number;
    total_odds: string;
    is_quick_bet: boolean;
    potential_win: number;
    potential_comboboost_win: number;
  };
  provider_betslip_id: string;
};

export type SportsbookPlaceBetMetadata = {
  amount: number;
  gameId: string;
  userId: string;
  eventId: string;
  direction: 'debit' | 'credit';
  eventType: typeof FungamessEventTypes.BET_PLACING;
  extraData: {
    betslip: SportsbookBetslip;
    potential_win: number;
    potential_comboboost_win: number;
  };
  transactionId: string;
};

export type SportsbookSettleBetMetadata = {
  amount: number;
  gameId: number;
  userId: string;
  eventId: string;
  direction: 'credit' | 'debit';
  eventType: FungamessEventType;
  extraData: {
    odds: string;
    is_cashout: boolean;
    selections: {
      id: string;
      odds: string;
      status: string;
      event_id: string;
    }[];
    is_snr_lost: false;
    transaction: {
      operation: string;
      betslip_id: string;
    };
  };
  transactionId: string;
};

export type SlotegratorSportsbookSettleBetMetadata = {
  amount: number;
  betslip: SlotegratorSportsBookBetslip;
  currency: string;
  playerId: string;
  betslipId: string;
  sessionId: string;
  transactionId: string;
  sportsbookUuid: string;
};
