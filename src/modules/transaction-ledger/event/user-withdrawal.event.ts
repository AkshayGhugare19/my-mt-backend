export class UserWithdrawalEvent {
  public readonly userId: string;
  public readonly pmId?: number;
  public readonly pmBtag?: string;
  public readonly amount: number;
  public readonly transactionId: string;

  constructor(data: UserWithdrawalEvent) {
    Object.assign(this, data);
  }
}
