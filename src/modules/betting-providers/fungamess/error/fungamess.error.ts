import { WrappedException } from '@common/interfaces/wrapped-exception.interface';
import { HttpException } from '@nestjs/common';

export class FungamessException extends Error implements WrappedException {
  private exception;
  private balance;

  constructor(exception: HttpException | Error, balance?: number) {
    super();
    this.name = 'FungamessException';
    this.exception = exception;
    this.balance = balance;
  }

  getException(): HttpException | Error {
    return this.exception;
  }

  getBalance(): number | undefined {
    return this.balance;
  }
}
