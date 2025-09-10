import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { zodErrorMessage } from '@utils/zod-validation-message';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const UpdateMasterTokenSettlementProofSchema = z.object({
  proof: z
    .string(zodErrorMessage(ValidationErrorMessages.INPUT_MUST_BE_A_STRING))
    .min(1, ValidationErrorMessages.INPUT_TOO_SHORT)
    .max(500, ValidationErrorMessages.INPUT_TOO_LONG),
});

@ZodDto()
export class UpdateMasterTokenSettlementProofDto extends createZodDto(
  UpdateMasterTokenSettlementProofSchema,
) {
  constructor(data?: UpdateMasterTokenSettlementProofDto) {
    super();
    if (data) {
      this.proof = data.proof;
    }
  }
}
