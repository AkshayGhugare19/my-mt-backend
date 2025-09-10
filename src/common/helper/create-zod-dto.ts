import {
  CompatibleZodInfer,
  ZodDtoStatic,
  createZodDto as baseCreateZodDto,
} from '@anatine/zod-nestjs';
import { OpenApiZodAny } from '@anatine/zod-openapi';
import { Logger } from '@nestjs/common';

export function createZodDto<T extends OpenApiZodAny>(
  schema: T,
): ZodDtoStatic<T> & {
  createSafe<D extends any>(data: D, returnInitialOnError?: boolean): CompatibleZodInfer<T>;
} {
  const base = baseCreateZodDto(schema) as ZodDtoStatic<any>;
  class OverrideSchemaHolder extends base {
    static schema: T;
    constructor() {
      super();
      this.schema = undefined;
    }

    static create(data: any): T {
      return this.zodSchema.parse(data);
    }

    static createSafe<D extends any>(data: D, returnInitialOnError = true): CompatibleZodInfer<T> {
      const result = this.zodSchema.safeParse(data);
      if (!result.success) {
        Logger.warn({
          message: 'ZodDto validation failed',
          error: result.error,
          data,
        });
        if (returnInitialOnError) {
          return data;
        }
        return null;
      }
      return result.data;
    }
  }
  return OverrideSchemaHolder as unknown as ZodDtoStatic<T> & {
    createSafe: (data: CompatibleZodInfer<T>) => CompatibleZodInfer<T>;
  };
}
