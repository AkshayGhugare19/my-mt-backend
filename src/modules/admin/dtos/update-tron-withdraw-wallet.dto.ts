import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import { TronWeb } from 'tronweb';

export const UpdateTronWithdrawWalletSchema = z
  .object({
    publicKey: z.string(),
    privateKey: z.string(),
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

    const derivedPublicKey = TronWeb.address.fromPrivateKey(data.privateKey);
    if (!derivedPublicKey) {
      cx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['privateKey'],
        message: 'Invalid private key',
      });
      return z.NEVER;
    }

    if (data.publicKey !== derivedPublicKey) {
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
export class UpdateTronWithdrawWalletDto extends createZodDto(
  UpdateTronWithdrawWalletSchema,
) {
  constructor(data: UpdateTronWithdrawWalletDto) {
    super();
    Object.assign(this, data);
  }
}

export const UpdateTronFeesWalletSchema = z
  .object({
    publicKey: z.string(),
    privateKey: z.string(),
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

    const derivedPublicKey = TronWeb.address.fromPrivateKey(data.privateKey);
    if (!derivedPublicKey) {
      cx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['privateKey'],
        message: 'Invalid private key',
      });
      return z.NEVER;
    }

    if (data.publicKey !== derivedPublicKey) {
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
export class UpdateTronFeesWalletDto extends createZodDto(
  UpdateTronFeesWalletSchema,
) {
  constructor(data: UpdateTronFeesWalletDto) {
    super();
    Object.assign(this, data);
  }
}
