import { createZodDto } from '@anatine/zod-nestjs';
import { isPublicKey } from '@metaplex-foundation/umi';
import { z } from 'zod';

export const SolanaSignFeePayerSchema = z.object({
  publicKey: z.string().superRefine((data, ctx) => {
    if (!isPublicKey(data)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid wallet address',
      });

      return z.NEVER;
    }

    return data;
  }),
  amount: z.number(),
  currency: z.enum(['USDC', 'USDT']),
});

export class SolanaSignFeePayerDto extends createZodDto(
  SolanaSignFeePayerSchema,
) {}
