import { Decimal } from '@prisma/client/runtime/library';

export type TransferJob = {
  amount: Decimal;
  currency: number;

  senderAddress: string;
  receiverAddress: string;

  blockNumber: number;
  blockTimestamp: number;
  transactionSignature: string;

  raw: any;
};

export type TronUSDTokenTransferJobState =
  | 'pending'
  | 'wait-for-fees'
  | 'wait-for-transfer'
  | 'completed';

export interface TronUSDTokenTransferJobBase<
  State extends TronUSDTokenTransferJobState,
> {
  state: State;
  userId: string;
  address: string;
  amount: number;
  presignedTx: string;
  currency: number;
}

export interface TronUSDTokenTransferPendingJob
  extends TronUSDTokenTransferJobBase<'pending'> {}

export interface TronUSDTokenTransferWaitForFeesJob
  extends TronUSDTokenTransferJobBase<'wait-for-fees'> {
  feesValue: number;
  feesTxId: string;
}

export interface TronUSDTokenTransferWaitForTransferJob
  extends TronUSDTokenTransferJobBase<'wait-for-transfer'> {
  transferTxId: string;
}

export type TronUSDTokenTransferJob =
  | TronUSDTokenTransferPendingJob
  | TronUSDTokenTransferWaitForFeesJob
  | TronUSDTokenTransferWaitForTransferJob;
