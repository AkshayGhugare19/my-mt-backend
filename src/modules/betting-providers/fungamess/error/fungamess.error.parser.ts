import { ErrorParser } from '@common/error-filters/error-parsers';
import { SportsExchangeException } from '@modules/betting-providers/sports-exchange/error/sports-exchange.error';
import {
  FungamessOptionalBalanceResponse,
  FungamessResponse,
} from '@modules/betting-providers/fungamess/types';
import { HttpException, HttpStatus } from '@nestjs/common';

export const FungamessErrorParser: ErrorParser = (
  error: SportsExchangeException,
): {
  body: FungamessResponse<FungamessOptionalBalanceResponse>;
  statusCode: HttpStatus;
} => {
  const exception = error.getException();
  if (exception instanceof HttpException) {
    return {
      body: {
        status: false,
        errorDesc: exception.message,
        balance: error.getBalance(),
        errors: {
          code: exception.getStatus(),
          error: exception.message,
        }
      } as FungamessResponse<FungamessOptionalBalanceResponse>,
      statusCode: 200,
    };
  }
  return {
    body: {
      status: false,
      balance: error.getBalance(),
      errors: {
        code: 400,
        error: exception.message,
      }
    } as FungamessResponse<FungamessOptionalBalanceResponse>,
    statusCode: 200,
  };
};
