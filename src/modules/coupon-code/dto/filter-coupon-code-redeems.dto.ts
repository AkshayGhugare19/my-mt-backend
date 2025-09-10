import { createZodDto } from '@anatine/zod-nestjs';
import { isPublicKey } from '@metaplex-foundation/umi';
import { isAddress } from 'ethers';
import { TronWeb } from 'tronweb';
import { z } from 'zod';

export const FilterCouponCodeRedeemsSchema = z.object({
  casinoPlayerId: z.string().optional(),
  redeemerWallet: z
    .string()
    .optional()
    .superRefine((data, ctx) => {
      if (!data) return;

      if (!TronWeb.isAddress(data) && !isPublicKey(data) && !isAddress(data)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid wallet address',
        });
        return z.NEVER;
      }

      return data;
    }),
  code: z.string().min(1).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  minRedeemDate: z.date().optional(),
  maxRedeemDate: z.date().optional(),
  page: z.number(),
  limit: z.number(),
});

export class FilterCouponCodeRedeemsDto extends createZodDto(
  FilterCouponCodeRedeemsSchema,
) {}
