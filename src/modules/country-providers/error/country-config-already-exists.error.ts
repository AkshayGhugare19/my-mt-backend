import { SerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';

export class CountryConfigAlreadyExistsError extends SerializableException {
  defaultResponseCode = HttpStatus.BAD_REQUEST;
  name = 'CountryConfigAlreadyExistsError';

  constructor(message: string) {
    super({
      message,
    });
  }
}
