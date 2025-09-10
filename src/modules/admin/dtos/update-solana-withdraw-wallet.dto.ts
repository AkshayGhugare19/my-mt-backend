import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { isPublicKey } from '@metaplex-foundation/umi';
import { Keypair } from '@solana/web3.js';
import { z } from 'zod';
import bs58 from 'bs58';

export const UpdateSolanaWithdrawWalletSchema = z
  .object({
    publicKey: z.string(),
    privateKey: z.string(),
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

    const keypair = Keypair.fromSecretKey(bs58.decode(data.privateKey));

    if (!keypair) {
      cx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['privateKey'],
        message: 'Invalid private key',
      });
      return z.NEVER;
    }

    if (data.publicKey !== keypair.publicKey.toString()) {
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
export class UpdateSolanaWithdrawWalletDto extends createZodDto(
  UpdateSolanaWithdrawWalletSchema,
) {
  constructor(data: UpdateSolanaWithdrawWalletDto) {
    super();
    Object.assign(this, data);
  }
}

export const UpdateSolanaFeesWalletSchema = z
  .object({
    publicKey: z.string(),
    privateKey: z.string(),
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

    const keypair = Keypair.fromSecretKey(bs58.decode(data.privateKey));

    if (!keypair) {
      cx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['privateKey'],
        message: 'Invalid private key',
      });
      return z.NEVER;
    }

    if (data.publicKey !== keypair.publicKey.toString()) {
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
export class UpdateSolanaFeesWalletDto extends createZodDto(
  UpdateSolanaFeesWalletSchema,
) {
  constructor(data: UpdateSolanaFeesWalletDto) {
    super();
    Object.assign(this, data);
  }
}
