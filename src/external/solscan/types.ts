// "block_id": 275794898,
// "trans_id": "4AU5ShM99Db1yXr72jukaUNSJTnJtp76zt6CdL9ghatA3N4HYU9jaHre2HsHqWcKipKCD3MenvdShPsRrAU6CC4f",
// "block_time": 1720171655,
// "time": "2024-07-05T09:27:35.000Z",
// "activity_type": "ACTIVITY_SPL_TRANSFER",
// "from_address": "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
// "to_address": "6U91aKa8pmMxkJwBCfPTmUEfZi6dHe7DcFq2ALvB2tbB",
// "token_address": "So11111111111111111111111111111111111111112",
// "token_decimals": 9,
// "amount": 1587870559,
// "flow": "in"

export type SolscanTransferFlow = 'in' | 'out';

export interface SolscanTransfer {
  block_id: number;
  trans_id: string;
  block_time: number;
  time: string;
  activity_type: 'ACTIVITY_SPL_TRANSFER';
  from_address: string;
  to_address: string;
  token_address: string;
  token_decimals: number;
  amount: number;
  flow: SolscanTransferFlow;
}
