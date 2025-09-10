import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import Web3 from 'web3';
import { isAddress } from 'web3-validator';
import { z } from 'zod';

export const UpdateEthereumWithdrawWalletSchema = z
  .object({
    publicKey: z.string(),
    privateKey: z.string(),
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

    const web3 = new Web3();
    const account = web3.eth.accounts.privateKeyToAccount(data.privateKey);

    if (!account) {
      cx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['privateKey'],
        message: 'Invalid private key',
      });
      return z.NEVER;
    }

    if (data.publicKey !== account.address) {
      cx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['privateKey'],
        message: 'Private key does not match public key',
      });
      return z.NEVER;
    }

    return data;
  });

@ZodDto()
export class UpdateEthereumWithdrawWalletDto extends createZodDto(
  UpdateEthereumWithdrawWalletSchema,
) {
  constructor(data: UpdateEthereumWithdrawWalletDto) {
    super();
    Object.assign(this, data);
  }
}
