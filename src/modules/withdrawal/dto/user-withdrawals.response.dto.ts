import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { Logger } from '@nestjs/common';
import { WithdrawalRequest } from '@prisma/client';
import { decimalToNumber } from '@utils/decimal-do-number';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import {
  WITHDRAWAL_STATUSES,
  WithdrawalStatusSchema,
} from '../enum/withdrawal-status.enum';

const _UserWithdrawalSchema = z.object({
  id: z.string(),
  transactionHash: z.string().nullable(),
  amount: z.number(),
  status: WithdrawalStatusSchema,
  createdAt: z.date(),
  currency: z.number(),
  targetWallet: z.string(),
  blockchain: z.number().nullable(),
  usdAmount: z.number().optional(),
});

export class UserWithdrawalDto extends createZodDto(_UserWithdrawalSchema) {
  constructor(data: UserWithdrawalDto) {
    super();
    Object.assign(this, data);
  }
}

export const UserWithdrawalsResponseSchema = z.array(_UserWithdrawalSchema);

@ZodDto()
export class UserWithdrawalsResponseDto extends createZodDto(
  UserWithdrawalsResponseSchema,
) {
  constructor(data: UserWithdrawalsResponseDto) {
    super();

    Object.assign(this, data);
  }

  static fromWithdrawalRequests(
    withdrawalRequests: WithdrawalRequest[],
  ): UserWithdrawalsResponseDto {
    return withdrawalRequests.map(
      ({
        id,
        transactionHash,
        amount,
        status,
        createdAt,
        currency,
        targetWallet,
        blockchain,
        usdAmount,
      }): UserWithdrawalDto => {
        const parsedStatus = WithdrawalStatusSchema.safeParse(status);

        if (parsedStatus.success === false) {
          Logger.error(
            `Error parsing ${status} status`,
            'user-withdrawals.response.dto',
          );
        }

        return new UserWithdrawalDto({
          id,
          transactionHash,
          status: parsedStatus.success
            ? parsedStatus.data
            : WITHDRAWAL_STATUSES.PENDING,
          amount: decimalToNumber(amount) || 0,
          createdAt,
          currency,
          targetWallet,
          blockchain,
          usdAmount: usdAmount?.toNumber(),
        });
      },
    );
  }
}
