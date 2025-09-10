import { extendApi } from '@anatine/zod-openapi';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { z } from 'zod';

export const DisableBonusSchema = extendApi(
  z.object({
    disabled: z.boolean(
      zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_BOOLEAN, true),
    ),
  }),
);

@ZodDto()
export class DisableBonusDto extends createZodDto(DisableBonusSchema) {
  constructor(data: DisableBonusDto) {
    super();
    Object.assign(this, data);
  }
}
