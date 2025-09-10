import { BadRequestException } from '@nestjs/common';

export class FiltersContextNotFoundError extends Error {
  constructor() {
    super('Filters context not found');
    this.name = 'FiltersContextNotFoundError';
  }
}

export class FilterValidationError extends BadRequestException {
  constructor(message: string) {
    super(message);
    this.name = 'FilterValidationError';
  }
}
