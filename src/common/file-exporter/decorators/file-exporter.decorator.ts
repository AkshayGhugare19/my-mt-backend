import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { applyDecorators } from '@nestjs/common';

export function FileExporter(): MethodDecorator {
  return applyDecorators(SkipResponseFormatting());
}
