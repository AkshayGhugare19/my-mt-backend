import { SKIP_RESPONSE_FORMATTING } from '@common/constants';
import { ResponseFormat } from '@common/types';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseFormatter<T> implements NestInterceptor<T> {
  constructor(private readonly reflector: Reflector) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<unknown>> {
    return next
      .handle()
      .pipe(map((data: unknown) => this.handleResponse(data, context)));
  }

  private handleResponse(
    res: unknown,
    context: ExecutionContext,
  ): ResponseFormat<unknown> {
    const ctx = context.switchToHttp();
    const request: Request = ctx.getRequest();
    const response: Response = ctx.getResponse();
    const skipFormatting = this.reflector.get(
      SKIP_RESPONSE_FORMATTING,
      context.getHandler(),
    );

    if (skipFormatting) {
      return res as ResponseFormat<unknown>;
    }

    const { statusCode } = response;
    const { url } = request;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors = res && (res as { errors?: any }).errors;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res && delete (res as { errors?: any }).errors;

    return {
      success: true,
      statusCode,
      path: url,
      data: res,
      timestamp: new Date().toISOString(),
      errors,
    };
  }
}
