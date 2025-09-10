import { Decimal } from '@prisma/client/runtime/library';

export type CreateSessionResponse = {
  status: 1 | 0;
  message: string;
  data: Record<string, unknown> & { url: string };
};

export type SportsExchangeResponse = {
  status: boolean;
  message: string;
  data?: {
    balance: number;
    user_id: string | number;
  };
};

export type SportsExchangeUserData = {
  playerTag: string;
  balance: number;
};

export type SportsExchangeTab = 'default' | 'soccer' | 'tennis' | 'cricket';

export type PlaceSportsExchangeBet = {
  userId: string;
  sportName: string;
  sportId: string;
  amount: Decimal;
  exposure: Decimal;
  matchName: string;
  matchId: string;
  roundName: string;
  roundId: string;
  size: number;
  odds: number;
  selection: string | undefined;
  backLay: number;
  result: 'pending';
  transactionId: string;
};

export type SettleSportsExchangeBet = {
  userId: string;
  sportName: string | undefined;
  sportId: string | undefined;
  amount: Decimal;
  exposure: Decimal;
  matchName: string;
  matchId: string;
  roundName: string;
  roundId: string;
  result: string;
  bets: {
    transactionId: string;
    winLose: Decimal;
  }[];
};

export type RollbackSportsExchangeBets = {
  userId: string;
  exposure: Decimal;
  roundName: string;
  roundId: string;
  amount: Decimal;
};
