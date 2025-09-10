import { OptionalFilterValue } from '@meta/filters/tree';
import { BalanceInfo } from '@modules/balance/types';
import { SportsbookBetslipBet } from '@modules/betting-providers/fungamess/types';
import { Prisma, Role as PrismaRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export const updateVipPreferencesSelector =
  Prisma.validator<Prisma.UserUpdateInput>()({
    isBonusEnabled: true,
  });

export type UpdateVipPreferences = Partial<{
  [K in keyof typeof updateVipPreferencesSelector as (typeof updateVipPreferencesSelector)[K] extends true
    ? K
    : never]: Prisma.UserUpdateInput[K];
}>;

export type MasterUser = {
  createdAt: Date;
  id: string;
  email: string | null;
  enable2FA: boolean;
  nickname: string | null;
  masterId: string | null;
  wallet: string | null;
  roles: PrismaRole[];
  balance: Decimal;
  debt: Decimal;
  totalIssuedTo: Decimal;
  totalSettled: Decimal;
  maxExposurePerVip: Decimal | null;
  resetPasswordRequired: boolean;
  maxNumberOfUsers: number | null;
  predefinedBookieStake: Decimal | null;
  flexibleBookieStake: Decimal | null;
  managedUsers: number;
  pnl?: Decimal;
  currentExposure?: Decimal;
  blockedAt: Date | null;
};

export type SuperMasterUser = {
  createdAt: Date;
  id: string;
  email: string;
  enable2FA: boolean;
  nickname: string;
  roles: PrismaRole[];
  balance: Decimal;
  managedUsers: number;
};

export type AdminUser = {
  createdAt: Date;
  id: string;
  email: string;
  enable2FA: boolean;
  nickname: string;
  roles: PrismaRole[];
};

export type UserWithStatistics = {
  createdAt: Date;
  id: string;
  hasPassword?: boolean;
  email: string | null;
  roles: PrismaRole[];
  masterId: string | null;
  wallet: string | null;
  nickname: string | null;
  avatar: string | null;
  maxBetSize: Decimal | null;
  canWithdraw: boolean;
  blockedAt: Date | null;
  userBookieStake: Decimal | null;
  playerTag: string | null;
  master: {
    nickname: string | null;
  } | null;
  balance: BalanceInfo | null;
  bonusBalance?: Decimal | null;
  favoriteGames: {
    id: string;
    name: string;
  }[];
  favoriteCategory: string;
  isBonusEnabled: boolean | null;
  web3AuthEmail: string | null;
  rank: string | null;
  partnerMatrixBtag: string | null;
};

export type MasterUserWithStatistics = {
  createdAt: Date;
  id: string;
  email: string | null;
  nickname: string | null;
  roles: PrismaRole[];
  wallet: string | null;
  masterId: string | null;
  blockedAt: Date | null;
  maxExposurePerVip: Decimal | null;
  maxNumberOfUsers: number | null;
  predefinedBookieStake: Decimal | null;
  flexibleBookieStake: Decimal | null;
  currentExposure?: Decimal | null;
  _count: {
    users: number;
  };
  balance: {
    balance: Decimal;
    debt: Decimal;
    totalIssuedTo?: Decimal;
    totalSettled?: Decimal;
    userId: string;
  } | null;
  pnl?: Decimal | null;
};

export type UpdateUserWithdrawalSettings = {
  canWithdraw: boolean;
};

export type TransactionsReportItem = {
  id: string;
  date: Date;
  proof: string;
  amount: number;
  status: string;
};

export type BaseGameReportItem = {
  id: string;
  date: Date;
  amount: number;
  settlement: number;
  previousBalance: number;
  status: string;
};

export type GameBetReportItem = BaseGameReportItem & {
  game: string;
  betId: string;
};

export type SportsbookBetReportItem = BaseGameReportItem & {
  sport: string;
  event: string;
  outcome: string;
  isCashOut: boolean;
  tournament: string;
  game: string;
  betId: string;
  transactionId?: string;
};

export type SportsbookExtendedBetReportItem = BaseGameReportItem & {
  type: 'sportsbook';
  isCashOut: boolean;
  betId: string;
  game?: string;
  transactionId?: string;
  extraData: {
    bets: (SportsbookBetslipBet & { status: string })[];
    potentialWin?: number;
    potentialComboboostWin?: number;
  };
};

export type SportsExchangeBetReportItem = {
  id: string;
  status: string;
  amount: number;
  settlement: number;
  date: Date;
  event: string;
  team: string;
  sport: string;
  marketName: string;
  previousBalance: number | null;
  side: string;
  rate: number;
  betId: string;
};

export type Wallets = {
  depositTronPublicKey?: string;
  withdrawTronPublicKey?: string;
  feesTronWalletPublicKey?: string;
  depositSolanaPublicKey?: string;
  withdrawSolanaPublicKey?: string;
  feesSolanaWalletPublicKey?: string;
  depositEthereumPublicKey?: string;
  withdrawEthereumPublicKey?: string;
  settlementPublicKey?: string;
  ownWallet?: string;
};

export interface DepositReportItem {
  id: string;
  userId: string;
  userEmail?: string;
  userNickname?: string;
  userWallet?: string;
  amount: number;
  date: string;
  proof: string;
  blockchain?: number;
  usdAmount?: number;
  cryptoAmount: number;
}

export interface WithdrawalReportItem {
  id: string;
  userId: string;
  status: string;
  userEmail?: string;
  userNickname?: string;
  userWallet?: string;
  amount: number;
  date: string;
  proof?: string;
  targetWallet: string;
  blockchain?: number;
  usdAmount?: number;
}

export type BetReportFilters = {
  userSearch: OptionalFilterValue<string>;
  date: OptionalFilterValue<[Date, Date]>;
  amount: [number, number] | undefined;
  odds: OptionalFilterValue<[number, number]>;
  outcomeWin: boolean | undefined;
  outcomeLoss: boolean | undefined;
  outcomeCashOut: boolean | undefined;
  outcomePending: boolean | undefined;
  categoryGames: boolean | undefined;
  categorySportsbook: boolean | undefined;
  categorySportsExchange: boolean | undefined;
};
