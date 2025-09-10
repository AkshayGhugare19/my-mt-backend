import { SetMetadata, applyDecorators } from '@nestjs/common';

export const ZodDto = (): (<TFunction extends Function, Y>(
  target: object | TFunction,
  propertyKey?: string | symbol,
  descriptor?: TypedPropertyDescriptor<Y>,
) => void) => {
  return applyDecorators(SetMetadata('transform-zod-dto', true));
};
