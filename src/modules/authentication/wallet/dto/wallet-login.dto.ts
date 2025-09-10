import { isPublicKey } from '@metaplex-foundation/umi';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { TronWeb } from 'tronweb';
import { isAddress } from 'web3-validator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';

const walletLoginSchema = z.object({
  walletAddress: z.string().superRefine((data, ctx) => {
    if (!TronWeb.isAddress(data) && !isPublicKey(data) && !isAddress(data)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid wallet address',
      });
      return z.NEVER;
    }
    return data;
  }),
  signature: z.string(),
  partnerMatrixBtag: z
    .string()
    .optional()
    .describe('Partner Matrix affiliate btag'),
  countryCode: z.string().min(2, ValidationErrorMessages.INPUT_TOO_SHORT).max(2, ValidationErrorMessages.INPUT_TOO_LONG).optional(),

});

@ZodDto()
export class WalletLoginDto extends createZodDto(walletLoginSchema) {
  constructor(data: WalletLoginDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
