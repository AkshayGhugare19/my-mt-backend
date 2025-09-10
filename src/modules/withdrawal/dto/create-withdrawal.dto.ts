import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { WithdrawalRequestCurrency } from '@infrastructure/database/prisma/constants';
import { isPublicKey } from '@metaplex-foundation/umi';
import { TronWeb } from 'tronweb';
import { isAddress } from 'web3-validator';
import { z } from 'zod';

export const CreateWithdrawalSchema = z.object({
  amount: z
    .number({ coerce: true })
    .gt(0, { message: ErrorMessages.INVALID_AMOUNT }),
  currency: z
    .number()
    .refine(
      (value) => Object.values(WithdrawalRequestCurrency).includes(value),
      {
        message: ErrorMessages.INVALID_CURRENCY,
      },
    ),
  wallet: z.string().superRefine((data, ctx) => {
    if (!TronWeb.isAddress(data) && !isPublicKey(data) && !isAddress(data)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: ErrorMessages.INVALID_WALLET_ADDRESS,
      });
      return z.NEVER;
    }
    return data;
  }),
});

@ZodDto()
export class CreateWithdrawalDto extends createZodDto(CreateWithdrawalSchema) {
  constructor(data: CreateWithdrawalDto) {
    super();

    Object.assign(this, data);
  }
}
