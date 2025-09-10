import { extendApi } from '@anatine/zod-openapi';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export type Constructor<T extends any[]> = new (...args: T) => {};

export type ResponseFormat<T, E = Error> = {
  success: boolean;
  statusCode: number;
  path: string;
  data: T;
  errors?: E;
  timestamp: string;
};

export type ResponseErrorFormat<E = Error> = Omit<
  ResponseFormat<void, E>,
  'data'
> & {
  error: string;
};

export type CursorPaginationRequest = {
  limit: number;
  cursor: string;
};

export type CursorPaginationResponse<T> = {
  data: T[];
  cursor: number | undefined;
};

export type PagePaginationRequest = {
  limit?: number;
  page?: number;
};

export type PagePaginationResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export const PagePaginationResponseSchema = <T>(params: {
  [keyName: string]: z.ZodType<T>;
}): Constructor<any> => {
  const paramsKeys = Object.keys(params);
  if (!paramsKeys.length) {
    throw new Error('dto param is required');
  }
  if (paramsKeys.length > 1) {
    throw new Error('only one dto param is allowed');
  }
  const dtoName = paramsKeys[0];
  const dto = params[dtoName];
  const C = class extends createZodDto(
    extendApi(
      z.object({
        data: z.array(dto),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
    ),
  ) {};
  Object.defineProperty(C, 'name', {
    value: `PagePaginationResponse_${dtoName}`,
  });
  return C;
};

export type Wrapper<T> = T;

export type PartialUndefined<T> = {
  [P in keyof T]?: T[P] | undefined;
};

export class TestDto<T> {
  data: T;
}
