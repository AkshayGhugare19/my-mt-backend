import { SetMetadata, applyDecorators } from '@nestjs/common';

export function Public(): any {
  return applyDecorators(SetMetadata('publicRoute', true));
}
