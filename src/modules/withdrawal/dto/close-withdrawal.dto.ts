import {
  ETHEREUM_EXPLORER_URLS,
  SOLANA_EXPLORER_URLS,
  TRON_EXPLORER_URLS,
} from '@common/constants';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CloseWithdrawalSchema = z.object({
  proof: z
    .string()
    .superRefine((proof, ctx) => {
      const trimmedProof = proof.trim();

      const explorerUrl =
        TRON_EXPLORER_URLS.find((url) => {
          return trimmedProof.startsWith(url);
        }) ||
        SOLANA_EXPLORER_URLS.find((url) => {
          return trimmedProof.startsWith(url);
        }) ||
        ETHEREUM_EXPLORER_URLS.find((url) => {
          return trimmedProof.startsWith(url);
        });
      const transactionHash = explorerUrl
        ? trimmedProof.substring(explorerUrl.length)
        : trimmedProof;

      if (
        !transactionHash.match(/^[a-fA-F0-9]{64}$/) &&
        !transactionHash.match(/^[1-9A-HJ-NP-Za-km-z]{43,88}$/) &&
        !transactionHash.match(/^0x[a-fA-F0-9]{64}$/)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ErrorMessages.INVALID_TRANSACTION_HASH,
        });
        return z.NEVER;
      }

      return transactionHash;
    })
    .transform((proof) => {
      const trimmedProof = proof.trim();

      const explorerUrl =
        TRON_EXPLORER_URLS.find((url) => {
          return trimmedProof.startsWith(url);
        }) ||
        SOLANA_EXPLORER_URLS.find((url) => {
          return trimmedProof.startsWith(url);
        }) ||
        ETHEREUM_EXPLORER_URLS.find((url) => {
          return trimmedProof.startsWith(url);
        });

      return explorerUrl
        ? trimmedProof.substring(explorerUrl.length)
        : trimmedProof;
    }),
  withdrawalId: z.string(),
});

@ZodDto()
export class CloseWithdrawalDto extends createZodDto(CloseWithdrawalSchema) {
  constructor(data: CloseWithdrawalDto) {
    super();

    Object.assign(this, data);
  }
}
