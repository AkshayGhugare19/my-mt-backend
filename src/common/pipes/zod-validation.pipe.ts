import { TRANSFORM_ZOD_DTO } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ZodDtoStatic, ZodValidationPipe } from '@anatine/zod-nestjs';
import { ZodError } from 'zod';
function createValidationException(error: ZodError): BadRequestException {
  const errors = error.flatten().fieldErrors;
  const exception = new BadRequestException({ errors });
  exception.name = ErrorMessages.VALIDATION_FAILED;
  return exception;
}

@Injectable()
export class CustomZodValidationPipe extends ZodValidationPipe {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const { metatype } = metadata;

    const sanitizedValue = this.baseTransform(value, metadata);
    if (metatype && this.reflector.get(TRANSFORM_ZOD_DTO, metatype)) {
      // eslint-disable-next-line new-cap
      const newInstance = new metatype(sanitizedValue);
      delete newInstance.schema;
      return newInstance;
    }
    return sanitizedValue;
  }

  private baseTransform(value: unknown, metadata: ArgumentMetadata): unknown {
    const zodSchema = (metadata?.metatype as ZodDtoStatic)?.zodSchema;

    if (zodSchema) {
      const parseResult = zodSchema.safeParse(value);

      if (!parseResult.success) {
        const { error } = parseResult;

        throw createValidationException(error);
      }

      return parseResult.data;
    }

    return value;
  }
}
