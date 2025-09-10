import { BetProvider } from '@modules/bet/enum/bet-providers.enum';
import { TransactionCounterParty } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionStatus } from '@modules/transaction-ledger/enum/status.enum';
import { TransactionTargetBalance } from '@modules/transaction-ledger/enum/target-balance.enum';
import { TransactionOperationType } from '@modules/transaction-ledger/enum/type.enum';
import { Decimal } from '@prisma/client/runtime/library';

export class BetTransactionEvent {
  public readonly betId: string;
  public readonly thirdPartyIdentifier: string;
  public readonly amount: Decimal;
  public readonly usdAmount: Decimal;
  public readonly transactionId: string;
  public readonly status: TransactionStatus;
  public readonly operationType: TransactionOperationType;
  public readonly targetBalance: TransactionTargetBalance;
  public readonly counterParty: TransactionCounterParty;
  public readonly referenceId: string;
  public readonly userId: string;
  public readonly pmId?: number;
  public readonly pmBtag?: string;
  public readonly provider: BetProvider;
  public readonly metadata?: Record<string, any>;

  constructor(data: BetTransactionEvent) {
    Object.assign(this, data);
  }
}
