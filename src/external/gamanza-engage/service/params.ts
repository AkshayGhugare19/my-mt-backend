export type GameTransactionStatus =
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING'
  | 'CANCELED';

type GameTransactionEvent = {
  playerId: string;
  realMoneyAmount: number;
  bonusMoneyAmount: number;
  exchangeRate: number;
  date: string;
  currency: string;
  transactionStatus: GameTransactionStatus;
  transactionType: 'BET' | 'WIN';
  transactionId: string;
  playerIp?: string;
  gameCategoryId: string;
  gameCategoryName: string;
  gameProviderId: string;
  gameProviderName: string;
  gameId: string;
  gameName: string;
  betAmount?: number;
  realMoneyBalance: number;
  bonusMoneyBalance: number;
  gameSessionId: string;
  categoryProviderId?: string;
};

export type SendGameTransactionEventParams = {
  gameTransactionRound: GameTransactionEvent[];
};

export type MoneyTransactionStatus =
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING'
  | 'CANCELED';

export type SendMoneyTransactionEventParams = {
  playerId: string;
  amount: number;
  exchangeRate: number;
  date: string;
  currency: string;
  transactionStatus: MoneyTransactionStatus;
  transactionType: 'DEPOSIT' | 'WITHDRAW' | 'MANUAL_CREDIT' | 'MANUAL_DEBIT';
  transactionId: string;
  cardType?: string;
  cardCompany?: string;
  paymentMethod?: string;
  playerIp?: string;
  paymentProvider?: string;
  realMoneyBalance: number;
  bonusMoneyBalance: number;
  manualCategory?: string;
};

export type SendMoneyEventParams = {
  playerId: string;
  transactionType: 'DEPOSIT' | 'WITHDRAW' | 'MANUAL_CREDIT' | 'MANUAL_DEBIT';
  transactionId: string;
};

type Outcome = {
  sportName?: string;
  tournamentName?: string;
  odds?: number;
  criterial?: string;
  outcome?: string
};

type Bet = {
  eventName: string;
  teams?: string[];
  market?: string;
  matchDate: string;
  outcomes?: Outcome[];
  sportName?: string;
  tournamentName?: string;
  odds?: number;
};

export type SendSportTransactionEventParams = {
  playerId: string;
  transactionId: string;
  transactionIdReference?: string;
  realMoneyAmount: number;
  bonusMoneyAmount: number;
  currency: string;
  exchangeRate: number;
  date: string;
  realMoneyBalanceBefore?: number;
  realMoneyBalance: number;
  bonusMoneyBalanceBefore?: number;
  bonusMoneyBalance: number;
  transactionStatus: 'APPROVED';
  transactionType: 'BET' | 'SETTLEMENT' | 'CASHOUT';
  bet: Bet[];
};

export type UpdateUserProgressParams = {
  userId: string;
  level?: number;
  rank?: string;
};

export type GetPlayerCardsInformationParams = {
  limit?: number; // Default: 1000 | Max: 1000
  next?: string;
  delta?: string;
};

export type GetPurchaseInformationParams = {
  limit?: number;
  next?: string;
  delta?: string;
};

export type GetRewardShopItemParams = {
  limit?: number;
  next?: string;
  delta?: string;
};

export type GetRewardShopOrderParams = {
  limit?: number;
  next?: string;
  delta?: string;
};

export type GetRanksParams = {
  limit?: number;
  next?: string;
  delta?: string;
};

export type GetRanksLevelsParams = {
  limit?: number;
  next?: string;
  delta?: string;
};

export type GetRewardsInformationParams = {
  limit?: number;
  next?: string;
  delta?: string;
};
