export type AccountTransfersParams = {
  utcFrom?: number;
  utcTo?: number;
  inflow?: boolean;
  outflow?: boolean;
  mint?: string;
  limit?: number;
  page?: number;
};
