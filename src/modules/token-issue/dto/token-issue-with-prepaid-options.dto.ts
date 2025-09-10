import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { z } from 'zod';

export const TokenIssueWithPrepaidOptionsSchema = z.object({
  prepaid: z.number({ coerce: true }).min(0).max(1).optional(),
  paymentType: z.enum(['cash', 'usdt']).optional(),
  proof: z.string().max(500, ValidationErrorMessages.INPUT_TOO_LONG).optional(),
});
