export type RegisterNewPlayerResponse = {
  error_code: number;
  error_message: string;

  id: number;
  parent_id: number;
  parent_external_id?: number;
  btag: string;
  sub_btag?: string;
  skin_id: number;
  show_id: string;
  username?: string;
  nickname?: string;
  country?: string;
  reg_date?: string;
  has_postback_url?: string;
};

export type GetPlayerDataResponse = {
  error_code: number;
  error_message: string;

  id: number;
  parent_id: number;
  parent_external_id?: number;
  btag: string;
  sub_btag?: string;
  skin_id: number;
  show_id: number;
  username?: string;
  nickname?: string;
  country?: string;
  reg_date?: string;
  has_postback_url?: string;
};

export type CreateTransactionResponse = {
  error_code: number;
  error_message: string;
  postback_url?: {
    [transaction_id: string]: {
      [s2s_event: string]: string;
    };
  };
};

export type UpdateTransactionResponse = {
  error_code: number;
  error_message: string;
  postback_url?: {
    [transaction_id: string]: {
      [s2s_event: string]: string;
    };
  };
};

export type CreateTransactionBulkResponse = {
  error_code: number;
  error_message: string;
  failed: {
    [transaction_id: string]: {
      error_code: number;
      error_message: string;
    };
  };
  postback_url?: {
    [transaction_id: string]: {
      [s2s_event: string]: string;
    };
  };
};

export type UpdateTransactionBulkResponse = {
  error_code: number;
  error_message: string;
  failed: {
    [transaction_id: string]: {
      error_code: number;
      error_message: string;
    };
  };
  postback_url?: {
    [transaction_id: string]: {
      [s2s_event: string]: string;
    };
  };
};
