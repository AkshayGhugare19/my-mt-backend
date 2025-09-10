import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { isAddress } from 'web3-validator';
import { z } from 'zod';

export const UpdateEthereumDepositWalletSchema = z
  .object({
    publicKey: z.string(),
    twoFactorAuthenticationCode: z.string(),
  })
  .superRefine((data, cx) => {
    if (!isAddress(data.publicKey)) {
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
export class UpdateEthereumDepositWalletDto extends createZodDto(
  UpdateEthereumDepositWalletSchema,
) {
  constructor(data: UpdateEthereumDepositWalletDto) {
    super();
    Object.assign(this, data);
  }
}
