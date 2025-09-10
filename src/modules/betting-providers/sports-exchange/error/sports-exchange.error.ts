import { WrappedException } from '@common/interfaces/wrapped-exception.interface';
import { HttpException } from '@nestjs/common';

export class SportsExchangeException extends Error implements WrappedException {
  private exception;
  private balance: number;
  private playerTag: string;

  constructor(
    exception: HttpException | Error,
    playerTag: string,
    balance?: number,
  ) {
    super();
    this.name = 'SportsExchangeException';
    this.exception = exception;
    this.balance = balance || 0;
    this.playerTag = playerTag;
  }

  getException(): HttpException | Error {
    return this.exception;
  }

  getBalance(): number {
    return this.balance;
  }

  getPlayerTag(): string {
    return this.playerTag;
  }
}
