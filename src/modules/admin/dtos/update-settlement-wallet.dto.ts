import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { TronWeb } from 'tronweb';
import { isPublicKey } from '@metaplex-foundation/umi';
import { isAddress } from 'web3-validator';

export const UpdateSettlementWalletSchema = z
  .object({
    publicKey: z.string(),
    twoFactorAuthenticationCode: z.string().optional(),
  })
  .superRefine((data, cx) => {
    if (
      !TronWeb.isAddress(data.publicKey) &&
      !isPublicKey(data.publicKey) &&
      !isAddress(data.publicKey)
    ) {
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
export class UpdateSettlementWalletDto extends createZodDto(
  UpdateSettlementWalletSchema,
) {
  constructor(data: UpdateSettlementWalletDto) {
    super();
    Object.assign(this, data);
  }
}
