import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { Roles, UserRoleSchema } from '@modules/role/enum/role.enum';
import { Logger } from '@nestjs/common';
import { decimalToNumber } from '@utils/decimal-do-number';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';
import {
  WITHDRAWAL_STATUSES,
  WithdrawalStatusSchema,
} from '../enum/withdrawal-status.enum';
import { WithdrawalRequestWithUser } from '../types';

const _WithdrawalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userEmail: z.string().email().nullable(),
  userWallet: z.string().nullable(),
  userType: UserRoleSchema,
  transactionHash: z.string().nullable(),
  amount: z.number(),
  status: WithdrawalStatusSchema,
  firstApprover: z.string().nullable(),
  secondApprover: z.string().nullable(),
  firstApprovalAt: z.date().nullable(),
  secondApprovalAt: z.date().nullable(),
  proof: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  currency: z.number(),
  targetWallet: z.string(),
  blockchain: z.number().nullable(),
  usdAmount: z.number().optional(),
});

class _WithdrawalDto extends createZodDto(_WithdrawalSchema) {
  constructor(data: _WithdrawalDto) {
    super();
    Object.assign(this, data);
  }
}

export const WithdrawalsResponseSchema = z.object({
  data: z.array(_WithdrawalSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

@ZodDto()
export class WithdrawalsResponseDto extends createZodDto(
  WithdrawalsResponseSchema,
) {
  constructor(data: WithdrawalsResponseDto) {
    super();

    Object.assign(this, data);
  }

  static fromWithdrawalRequests(params: {
    withdrawalRequests: WithdrawalRequestWithUser[];
    total: number;
    page: number;
    limit: number;
  }): WithdrawalsResponseDto {
    const { withdrawalRequests, total, page, limit } = params;
    return {
      data: withdrawalRequests.map(
        ({
          id,
          userId,
          transactionHash,
          amount,
          status,
          createdAt,
          updatedAt,
          user,
          firstApprovalAt,
          secondApprovalAt,
          firstApproverEmail,
          secondApproverEmail,
          proof,
          currency,
          targetWallet,
          blockchain,
          usdAmount,
        }): _WithdrawalDto => {
          const parsedStatus = WithdrawalStatusSchema.safeParse(status);
          const parsedUserType = UserRoleSchema.safeParse(
            user.roles.at(0)?.name,
          );

          if (parsedStatus.success === false) {
            Logger.error(
              `Error parsing ${status} withdrawal status. with id: ${id}`,
              'withdrawals.response.dto',
            );
          }

          if (parsedUserType.success === false) {
            Logger.error(
              `Error parsing ${user.roles.at(0)?.name} user role type. With id: ${userId}`,
              'withdrawals.response.dto',
            );
          }

          return new _WithdrawalDto({
            id,
            userId,
            transactionHash,
            userEmail: user.email,
            userWallet: user.wallet,
            userType: parsedUserType.success ? parsedUserType.data : Roles.USER,
            status: parsedStatus.success
              ? parsedStatus.data
              : WITHDRAWAL_STATUSES.PENDING,
            amount: decimalToNumber(amount) || 0,
            createdAt: new Date(createdAt),
            updatedAt: new Date(updatedAt),
            firstApprovalAt,
            secondApprovalAt,
            proof,
            firstApprover: firstApproverEmail,
            secondApprover: secondApproverEmail,
            currency,
            targetWallet,
            blockchain,
            usdAmount: usdAmount?.toNumber(),
          });
        },
      ),
      limit,
      page,
      total,
    };
  }
}
