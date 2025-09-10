import { HttpStatus } from '@nestjs/common';
import { ErrorParser } from '@common/error-filters/error-parsers';
import { EvenBetResultDto } from './dto/event.dto';

const errorMap = {
  INVALID_SIGNATURE: {
    code: 1,
    description: 'Invalid signature',
  },
  PLAYER_NOT_FOUND: {
    code: 2,
    description: 'Player not found',
  },
  INSUFFICIENT_FUNDS: {
    code: 3,
    description: 'Insufficient funds',
  },
  INVALID_REQUEST_PARAMS: {
    code: 4,
    description: 'Invalid request params',
  },
  REFERENCE_TRANSACTION_NOT_FOUND: {
    code: 5,
    description: 'Reference transaction does not exist',
  },
  REFERENCE_TRANSACTION_INCOMPATIBLE: {
    code: 6,
    description: 'Reference transaction has incompatible data',
  },
  WRONG_AUTH_OR_SESSION_EXPIRED: {
    code: 7,
    description: 'Wrong authentication/Session expired',
  },
} as const;

export type ErrorType = keyof typeof errorMap;

export class EvenBetError extends Error {
  constructor(
    private errorName: ErrorType,
    private balance?: number,
  ) {
    super();
    this.name = 'EvenBetError';
  }

  getBalance(): number {
    return this.balance ?? 0;
  }

  getErrorCode(): number {
    const error = errorMap[this.errorName];
    return error.code;
  }

  getErrorDescription(): string {
    const error = errorMap[this.errorName];
    return error.description;
  }
}

export const EvenBetErrorParser: ErrorParser = (
  error: EvenBetError,
): {
  body: EvenBetResultDto;
  statusCode: HttpStatus;
} => {
  return {
    body: new EvenBetResultDto({
      balance: error.getBalance() * 100,
      errorCode: error.getErrorCode(),
      errorDescription: error.getErrorDescription(),
    }),
    statusCode: 200,
  };
};
