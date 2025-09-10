import { Web3AuthPayloadTypes } from '@modules/authentication/web3auth/enum/payload-type.enum';
import { z } from 'zod';

export const Web3AuthJwtPayloadSchema = z.object({
  type: z.literal(Web3AuthPayloadTypes.SOCIALS),
  iat: z.number(),
  aud: z.string(),
  nonce: z.string(),
  iss: z.string(),
  wallets: z
    .object({
      public_key: z.string(),
      type: z.enum(['web3auth_app_key', 'web3auth_threshold_key']).optional(),
      curve: z.enum(['secp256k1', 'ed25519']),
    })
    .array(),
  email: z.string().optional(),
  name: z.string().optional(),
  profileImage: z.string().optional(),
  verifier: z.string(),
  verifierId: z.string(),
  aggregateVerifier: z.string(),
  exp: z.number(),
});

export const Web3AuthWalletJwtPayloadSchema = z.object({
  type: z.literal(Web3AuthPayloadTypes.EXTERNAL),
  iat: z.number(),
  aud: z.string(),
  iss: z.string(),
  wallets: z
    .object({
      address: z.string(),
      type: z.enum(['ethereum', 'solana', 'starkware']),
    })
    .array(),
  exp: z.number(),
});

export type Web3AuthJwtPayload = z.infer<typeof Web3AuthJwtPayloadSchema>;
export type Web3AuthWalletJwtPayload = z.infer<typeof Web3AuthWalletJwtPayloadSchema>;
