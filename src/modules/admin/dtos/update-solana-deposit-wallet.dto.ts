import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { isPublicKey } from '@metaplex-foundation/umi';
import { z } from 'zod';

export const UpdateSolanaDepositWalletSchema = z
  .object({
    publicKey: z.string(),
    twoFactorAuthenticationCode: z.string(),
  })
  .superRefine((data, cx) => {
    if (!isPublicKey(data.publicKey)) {
      cx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publicKey'],
        message: 'Invalid wallet address',
      });
      return z.NEVER;
    }

    return data;
  });

@ZodDto()
export class UpdateSolanaDepositWalletDto extends createZodDto(
  UpdateSolanaDepositWalletSchema,
) {
  constructor(data: UpdateSolanaDepositWalletDto) {
    super();
    Object.assign(this, data);
  }
}
