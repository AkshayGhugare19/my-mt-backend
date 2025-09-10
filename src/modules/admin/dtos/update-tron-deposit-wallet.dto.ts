import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { TronWeb } from 'tronweb';

export const UpdateTronDepositWalletSchema = z
  .object({
    publicKey: z.string(),
    twoFactorAuthenticationCode: z.string(),
  })
  .superRefine((data, cx) => {
    if (!TronWeb.isAddress(data.publicKey)) {
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
export class UpdateTronDepositWalletDto extends createZodDto(
  UpdateTronDepositWalletSchema,
) {
  constructor(data: UpdateTronDepositWalletDto) {
    super();
    Object.assign(this, data);
  }
}
