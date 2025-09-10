import { ZodDto } from '@common/decorators/transform-dto.decorator';
import {
  WITHDRAWAL_STATUSES,
  WithdrawalStatusSchema,
} from '@modules/withdrawal/enum/withdrawal-status.enum';
import { WithdrawalRequest } from '@prisma/client';
import { decimalToNumber } from '@utils/decimal-do-number';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const CreateWithdrawalResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  transactionHash: z.string().nullable(),
  amount: z.number(),
  status: WithdrawalStatusSchema,
});

@ZodDto()
export class CreateWithdrawalResponseDto extends createZodDto(
  CreateWithdrawalResponseSchema,
) {
  constructor(data: CreateWithdrawalResponseDto) {
    super();

    Object.assign(this, data);
  }

  static fromWithdrawalRequest(
    withdrawalRequest: WithdrawalRequest,
  ): CreateWithdrawalResponseDto {
    const { id, userId, transactionHash, amount, status } = withdrawalRequest;
    const parsedStatus = WithdrawalStatusSchema.safeParse(status);

    if (parsedStatus.success === false) {
      console.error(`Error parsing ${status} status`);
    }

    return new CreateWithdrawalResponseDto({
      id,
      userId,
      transactionHash,
      status: parsedStatus.success
        ? parsedStatus.data
        : WITHDRAWAL_STATUSES.PENDING,
      amount: decimalToNumber(amount) || 0,
    });
  }
}
