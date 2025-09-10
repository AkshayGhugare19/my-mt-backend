import { ErrorMessages } from '@common/enums/error-messages.enum';
import { ISerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';
import { AxiosError } from 'axios';
export class FailedRequestError
  extends Error
  implements ISerializableException {
  private axiosError?: AxiosError;
  defaultResponseCode: number = HttpStatus.FAILED_DEPENDENCY;
  constructor(message: string, context?: string, axiosError?: AxiosError) {
    super(message);
    this.axiosError = axiosError;
    this.name = 'FailedRequestError';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getErrorResponse(): any {
    return this.axiosError?.response?.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getErrorPayload(): any {
    const errorPayload = {
      message: this.message,
      stack: this.stack,
      status: this.axiosError?.response?.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    if (this.axiosError) {
      errorPayload.errorData = this.getErrorResponse();
      errorPayload.status = this.axiosError.response?.status;
    }
  }

  getMessage(): string {
    return ErrorMessages.DEPENDENCY_REQUEST_FAILED;
  }

  getErrors(): undefined {
    return undefined;
  }
}
