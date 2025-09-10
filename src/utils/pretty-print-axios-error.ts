import { Logger } from '@nestjs/common';
import { AxiosError } from 'axios';

export const prettyPrintAxiosError = (
  error: Error,
  context: string,
  aditionalParams?: Record<string, unknown>,
): void => {
  if (!(error as AxiosError)?.isAxiosError) {
    Logger.error(
      {
        message: error?.message || error,
        stack: error?.stack,
        ...aditionalParams,
      },
      context,
    );
    return;
  }

  const { response } = error as AxiosError;

  if (!response) {
    Logger.error(
      {
        message: error.message || error,
        stack: error.stack,
        ...aditionalParams,
      },
      context,
    );
    return;
  }

  Logger.error(
    {
      data: response.data,
      status: response.statusText,
      message: error.message,
      ...aditionalParams,
    },
    context,
  );
};
