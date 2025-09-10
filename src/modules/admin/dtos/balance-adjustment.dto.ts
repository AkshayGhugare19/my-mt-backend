import {
  TransactionOperationType,
  TransactionOperationTypeSchema,
} from '@modules/transaction-ledger/enum/type.enum';
import { BalanceAdjustmentWithUserDetails } from '@modules/transaction-ledger/types';
import { Transaction } from '@prisma/client';
import { decimalToNumber } from '@utils/decimal-do-number';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const BalanceAdjustmentSchema = z.object({
  userId: z.string(),
  userNickname: z.string().optional(),
  userEmail: z.string().optional(),
  masterId: z.string(),
  masterNickname: z.string().optional(),
  masterEmail: z.string().optional(),
  amount: z.number(),
  type: TransactionOperationTypeSchema,
  createdAt: z.date(),
});

export class BalanceAdjustmentDto extends createZodDto(
  BalanceAdjustmentSchema,
) {
  constructor(data: BalanceAdjustmentDto) {
    super();
    Object.assign(this, data);
  }

  static from(data: Transaction): BalanceAdjustmentDto {
    return new BalanceAdjustmentDto({
      userId: data.userId,
      masterId: data.referenceId,
      amount: decimalToNumber(data.amount),
      type: data.operationType as TransactionOperationType,
      createdAt: data.createdAt,
    });
  }

  static fromAdjustmentWithUserDetails(
    data: BalanceAdjustmentWithUserDetails,
  ): BalanceAdjustmentDto {
    return new BalanceAdjustmentDto({
      userId: data.userId,
      masterId: data.referenceId,
      masterEmail: data?.master?.email,
      userEmail: data?.user?.email,
      masterNickname: data?.master?.nickname,
      userNickname: data?.user?.nickname,
      amount: decimalToNumber(data.amount),
      type: data.operationType as TransactionOperationType,
      createdAt: data.createdAt,
    });
  }
}
