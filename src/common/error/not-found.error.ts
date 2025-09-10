import { SerializableException } from '@common/error/serializable-exception.error';
import { HttpStatus } from '@nestjs/common';

export class NotFoundError extends SerializableException {
  defaultResponseCode = HttpStatus.NOT_FOUND;
  id?: string;
  entityType?: string;

  constructor(message: string, entityType?: string, id?: string) {
    super({ message });
    this.name = 'NotFoundError';
    this.id = id;
    this.entityType = entityType;
  }
}
