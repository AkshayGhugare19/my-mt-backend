import { SKIP_RESPONSE_FORMATTING } from '@common/constants';
import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const SkipResponseFormatting = (): CustomDecorator<string> =>
  SetMetadata(SKIP_RESPONSE_FORMATTING, true);
