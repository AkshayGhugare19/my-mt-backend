import { HttpStatus } from '@nestjs/common';
import { ErrorParser } from '@common/error-filters/error-parsers';
import { SlotegratorEventResult } from './dto/event.dto';

const errorMap = {
  INSUFFICIENT_FUNDS: 'Insufficient funds',
  INTERNAL_ERROR: 'Internal error',
} as const;

export type ErrorType = keyof typeof errorMap;

export class SlotegratorError extends Error {
  constructor(
    private errorName: ErrorType,
    private detailMessage?: string,
  ) {
    super(
      `${errorName} ${errorMap[errorName]}` + detailMessage
        ? `: ${detailMessage}`
        : '',
    );
    this.name = 'SlotegratorError';
  }

  getErrorCode(): string {
    return this.errorName;
  }

  getErrorDescription(): string {
    return `${errorMap[this.errorName]} ${this.detailMessage ?? ''}`.trim();
  }
}

export const SlotegratorErrorParser: ErrorParser = (
  error: SlotegratorError,
): {
  body: SlotegratorEventResult;
  statusCode: HttpStatus;
} => {
  return {
    body: {
      error_code: error.getErrorCode(),
      error_description: error.getErrorDescription(),
    },
    statusCode: 200,
  };
};
