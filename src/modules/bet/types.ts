import { BetProvider, BetProviders } from '@modules/bet/enum/bet-providers.enum';
import { BetStatus } from '@modules/bet/enum/bet-status.enum';
import { FungamessFundsEventDto } from '@modules/betting-providers/fungamess/dto/funds-event.dto';
import { BonusTriggerConfigType } from '@modules/bonus/enum';
import { Bet, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type CreateBetPayload = Pick<
  Bet,
  'betAmount' | 'exposure' | 'metadata' | 'previousBalance' | 'provider' | 'thirdPartyIdentifier' | 'status' | 'userId'
>;

export type CreateBet = {
  userId: string;
  thirdPartyIdentifier: string;
  provider: BetProvider;
  metadata?: Record<string, any>;
  betAmount: Decimal;
  balanceChange: Decimal; // This is the amount that the user bet, positive for bet, negative for refund
  exposure?: Decimal;
};

export type CreateSportsExchangeBet = {
  userId: string;
  thirdPartyIdentifier: string;
  provider: typeof BetProviders.SPORTS_EXCHANGE;
  debitTransactionId: string;
  metadata?: Record<string, any>;
  betAmount: Decimal;
  exposure: Decimal;
};

export type SettleBet = {
  betResult: Decimal; // This is the amount that the user won or lost, positive for win, negative for loss
  settlementAmount?: Decimal; // This is the amount that the user won or lost, positive for win, negative for loss
  winLoss: BetStatus;
  thirdPartyIdentifier: string;
  provider: BetProvider;
  metadata?: Record<string, any>;
  isAggregate?: boolean;
};

export type UpdateBet = {
  betResult: Decimal; // This is the amount that the user won or lost, positive for win, negative for loss
  settleAmount: Decimal; // This is the amount that the user won or lost, positive for win, negative for loss
  winLoss: BetStatus;
  thirdPartyIdentifier: string;
  provider: BetProvider;
  metadata?: Record<string, any>;
};

export type GenericBonusMetadata = {
  bonusTypes: BonusTriggerConfigType[];
  bonusId: string;
  consumeAmount: number;
  transactionId: string;
};

export type WageringBonusMetadata = {
  bonusTypes: BonusTriggerConfigType[];
  wageringBonusId: string;
  bonusId: string;
  consumeAmount: number;
  transactionId: string;
  progressIncrement?: {
    progressIncrement: number;
    lastSettledValue: number;
  };
};

type SingleBetMetadata<T = FungamessFundsEventDto> = {
  placeBet: FungamessFundsEventDto | T;
  settleBet: FungamessFundsEventDto;
};

type MultipleBetMetadata<T = FungamessFundsEventDto> = {
  placeBet: FungamessFundsEventDto[] | T[];
  settleBet: FungamessFundsEventDto[] | T[];
};

export type BetBonusMetadata = {
  bonusUsed: WageringBonusMetadata[];
  bonusBalanceChange?: {
    bonusBalanceId: number;
    balanceChange: Decimal;
  }[];
};

export type BetMetadata<T = FungamessFundsEventDto> = (SingleBetMetadata<T> | MultipleBetMetadata<T>) &
  BetBonusMetadata;

export type BetEvent = Pick<
  Bet,
  | 'id'
  | 'createdAt'
  | 'betAmount'
  | 'settlementAmount'
  | 'status'
  | 'previousBalance'
  | 'exposure'
  | 'thirdPartyIdentifier'
>;

export const betReportSelect = Prisma.validator<Prisma.BetFindManyArgs>()({
  include: {
    user: {
      select: {
        id: true,
        email: true,
        nickname: true,
        wallet: true,
        userRoles: { include: { role: true } },
      },
    },
    SlotegratorGameBets: { include: { game: true } },
    SlotegratorSportsBookBet: true,
  },
});

export type BetReport = Prisma.BetGetPayload<typeof betReportSelect>;

export type BetReportItem = {
  id: string;
  bet: BetReport;
  previousBalance: Decimal | null;
  userId: string;
  userEmail?: string;
  userNickname?: string;
  userWallet?: string;
  role: string;
  amount: number;
  targetBalance: {
    balance: string | null;
    amount: number;
  }[];
  date: string;
  odds: number;
  outcome: string;
  settlement: Decimal | null;
  category: string;
  game: string;
  betId: string;
  roundId?: string;
  gameId?: string;
  casinoPlayerId?: string;
  sessionId?: string;
};
