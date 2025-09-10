import { SportsExchangeSerializableException } from '@modules/betting-providers/sports-exchange/interface/sports-exchange-serializable-exception.interface';
import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientBalanceError
  extends HttpException
  implements SportsExchangeSerializableException {
  constructor(
    message: string,
    private balance: number,
    private playerTag: string,
  ) {
    super(message, HttpStatus.BAD_REQUEST);
    this.name = 'InsufficientBalanceError';
  }

  getBalance(): number {
    return this.balance;
  }

  getPlayerTag(): string {
    return this.playerTag;
  }
}
