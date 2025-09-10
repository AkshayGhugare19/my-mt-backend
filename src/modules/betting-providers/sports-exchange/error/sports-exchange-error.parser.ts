import { ErrorParser } from '@common/error-filters/error-parsers';
import { SportsExchangeException } from '@modules/betting-providers/sports-exchange/error/sports-exchange.error';
import { SportsExchangeResponse } from '@modules/betting-providers/sports-exchange/types';
import { HttpException, HttpStatus } from '@nestjs/common';

export const SportsExchangeErrorParser: ErrorParser = (
  error: SportsExchangeException,
): {
  body: SportsExchangeResponse;
  statusCode: HttpStatus;
} => {
  const exception = error.getException();
  if (exception instanceof HttpException) {
    return {
      body: {
        message: exception.message,
        status: false,
        data: {
          balance: error.getBalance(),
          user_id: error.getPlayerTag(),
        },
      } as SportsExchangeResponse,
      statusCode: exception.getStatus(),
    };
  }
  return {
    body: {
      status: false,
      message: exception.message,
      data: undefined,
    } as SportsExchangeResponse,
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  };
};
