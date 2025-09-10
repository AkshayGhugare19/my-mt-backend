import { StatisticsTarget } from '@modules/statistics/enum/statistics-target.enum';
import { Decimal } from '@prisma/client/runtime/library';

export type BucketAggregatorCategory = 'ggr';

export type FundsCountAndValue = {
  count: number;
  value: Decimal;
};

export type GgrCategories =
  | 'ngr'
  | 'fungamess'
  | 'sportExchange'
  | 'poker'
  | 'slotegrator';

export type FundsCategories = 'total' | 'withdrawals' | 'volume' | 'deposits' | 'tokenIssue';

export type GgrFormat<TReturn> = TReturn extends 'fungamess'
  ? {
      sportsBook: Decimal;
      games: Decimal;
    }
  : TReturn extends 'slotegrator'
    ? {
        sportsBook: Decimal;
        games: Decimal;
      }
    : Decimal;

export type StatisticsByTime<T> = {
  today: T;
  week: T;
  month: T;
  allTime: T;
};

export type FundsStatisticsPermissions = {
  readTotalUsersFundsStatistics: boolean;
  readVipFundsStatistics: boolean;
  readDepositsStatistics: boolean;
  readWithdrawalStatistics: boolean;
  readVolumeStatistics: boolean;
  readTokenIssueStatistics: boolean;
  readOwnVipFundsStatistics: boolean;
  readOwnVipVolumeStatistics: boolean;
  readOwnVipTokenIssueStatistics: boolean;
  readOwnMasterGrossPNL: boolean;
  readOwnMasterNetPNL: boolean;
  readOwnMasterDebt: boolean;
  readMasterDebt: boolean;
};

export type UserStatisticsOptions = {
  masterId?: string;
  target?: StatisticsTarget;
  timezone?: string;
};

export type DateRange = {
  startDate: Date;
  endDate: Date;
};
