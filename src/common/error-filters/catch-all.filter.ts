import { ErrorMessages } from '@common/enums/error-messages.enum';
import { ErrorMessageCodeToI18n } from '@common/enums/error-messages.translation';
import { getErrorParser } from '@common/error-filters/error-parsers';
import { isSerializableException } from '@common/error/serializable-exception.error';
import { ResponseErrorFormat } from '@common/types';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { camelCaseToSnakeCase } from '@utils/camel-case-to-snake-case';
import { Request } from 'express';
import { I18nService, logger } from 'nestjs-i18n';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly i18nService: I18nService,
  ) {}

  // eslint-disable-next-line sonarjs/cognitive-complexity
  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseData: ResponseErrorFormat<any> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: exception.name,
      success: false,
    };
    const errorParser = getErrorParser(exception.name);

    if (errorParser) {
      const { httpAdapter } = this.httpAdapterHost;
      const { body, statusCode } = errorParser(exception) || { body: {} };
      return httpAdapter.reply(ctx.getResponse(), body, statusCode);
    }

    if (isSerializableException(exception)) {
      responseData.error = exception.getMessage();
      responseData.statusCode = exception.defaultResponseCode || status;
      responseData.errors = exception.getErrors();
    }

    if (exception instanceof HttpException) {
      if (!/^[A-Z]+(?:_[A-Z]+)*$/g.test(exception.name)) {
        responseData.error = camelCaseToSnakeCase(exception.name);
      }
      const response = exception.getResponse();
      const responseMessage =
        typeof response === 'string'
          ? response
          : (<{ message: string }>response).message;
      responseData.error = responseMessage || responseData.error;
      responseData.errors =
        typeof response === 'object'
          ? (<{ errors: any }>response).errors
          : undefined;
    }

    if (
      !(exception instanceof HttpException) &&
      !isSerializableException(exception)
    ) {
      responseData.error = ErrorMessages.SOMETHING_WENT_WRONG;
    }

    if (responseData.statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      Logger.error({
        errorMessage: exception.message,
        stackTrace: exception.stack,
      });
    }

    const { httpAdapter } = this.httpAdapterHost;
    const originalErrorMessage = responseData.error;

    try {
      const locale = request.headers['accept-language'];
      responseData.error = this.i18nService.translate(
        ErrorMessageCodeToI18n[
          responseData.error as keyof typeof ErrorMessages
        ],
        {
          lang: locale,
        },
      );
    } catch (error) {
      logger.error({
        message: 'Error while translating error message',
        error: originalErrorMessage,
      });
      responseData.error = originalErrorMessage;
    }

    return httpAdapter.reply(
      ctx.getResponse(),
      responseData,
      responseData.statusCode,
    );
  }
}
