export type WithdrawalJobData = {
  userId: string;
  amount: number;
  pointsAmount: number;
  currency: number;
  blockchain: number;
  withdrawalRequestId: string;
  transactionLedgerId: string;
}
