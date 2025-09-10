import { z } from 'zod';

export const SolanaTokenIdempotentInstruction = z.object({
  program: z.string(),
  parsed: z.object({
    type: z.string(),
    info: z.object({
      account: z.string(),
      mint: z.string(),
      source: z.string(),
      systemProgram: z.string(),
      tokenProgram: z.string(),
      wallet: z.string(),
    }),
  }),
});

export type SolanaTokenIdempotentInstructionType = z.infer<
  typeof SolanaTokenIdempotentInstruction
>;

export const SolanaTokenTransferInstruction = z.object({
  program: z.string(),
  parsed: z.object({
    type: z.string(),
    info: z.object({
      amount: z.string(),
      authority: z.string(),
      destination: z.string(),
      source: z.string(),
    }),
  }),
});

export type SolanaTokenTransferInstructionType = z.infer<
  typeof SolanaTokenTransferInstruction
>;

export const SolanaLamportsTransferInstruction = z.object({
  program: z.string(),
  parsed: z.object({
    type: z.string(),
    info: z.object({
      lamports: z.number(),
      destination: z.string(),
      source: z.string(),
    }),
  }),
});

export type SolanaLamportsTransferInstructionType = z.infer<
  typeof SolanaLamportsTransferInstruction
>;
