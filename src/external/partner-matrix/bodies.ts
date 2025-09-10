import { TransactionType } from './types';

export type RegisterNewPlayerBody = {
  update?: boolean;
  date: string;
  btag: string;
  player: {
    skin_id: number;
    external_id: number;
    username: string;
    nickname?: string;
    country?: string;
    currency?: string;
    reg_date?: string;
  };
};

export type CreateTransactionBody = {
  skin_id: number;
  datetime: string;
  product_id: number;
  player_external_id?: number;
  player_id?: number;
  currency: string;
  transactions: {
    external_id: string;
    type: TransactionType;
    amount?: number;
    count?: number;
  }[];
};

export type UpdateTransactionBody = {
  skin_id: number;
  currency: string;
  transactions: {
    external_id: string;
    amount?: number;
    count?: number;
  }[];
};

export type CreateTransactionBulkBody = CreateTransactionBody[];

export type UpdateTransactionBulkBody = UpdateTransactionBody[];
