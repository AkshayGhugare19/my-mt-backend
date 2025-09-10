import { TokenSettlementSchema } from '@modules/token-settlement/dto/token-settlement.dto';
import { TokenSettlementRequestWithEmails } from '@modules/token-settlement/types';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const TokenSettlementAdminSchema = TokenSettlementSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
  targetEmail: z.string(),
  masterEmail: z.string(),
  targetNickname: z.string(),
  masterNickname: z.string(),
  requestedAmount: z.number(),
  settleAmount: z.number(),
  status: z.string(),
  targetId: z.string(),
  masterId: z.string(),
  proof: z.string().nullable().default(null),
  masterApproved: z.boolean(),
  superMasterApproved: z.boolean(),
  flexibleBookieStake: z.number().optional().nullable(),
  predefinedBookieStake: z.number().optional().nullable(),
});

export class TokenSettlementAdminDto extends createZodDto(
  TokenSettlementAdminSchema,
) {
  constructor(data: TokenSettlementAdminDto) {
    super();
    Object.assign(this, data);
  }

  static from(
    createdRequest: TokenSettlementRequestWithEmails & {
      flexibleBookieStake: number | Decimal;
      predefinedBookieStake: number | Decimal;
    },
  ): TokenSettlementAdminDto {
    return new TokenSettlementAdminDto({
      amount: decimalToNumber(createdRequest.amount),
      createdAt: createdRequest.createdAt,
      id: createdRequest.id,
      requestedAmount: decimalToNumber(createdRequest.amount),
      settleAmount: decimalToNumber(createdRequest.settleAmount),
      masterApproved: createdRequest.masterApprovedAt !== null,
      superMasterApproved: createdRequest.superMasterApprovedAt !== null,
      flexibleBookieStake: decimalToNumber(createdRequest.flexibleBookieStake),
      predefinedBookieStake: decimalToNumber(
        createdRequest.predefinedBookieStake,
      ),
      proof: createdRequest.proof,
      masterEmail: createdRequest.masterEmail,
      masterId: createdRequest.masterId,
      targetEmail: createdRequest.targetEmail,
      targetId: createdRequest.targetId,
      masterNickname: createdRequest.masterNickname,
      targetNickname: createdRequest.targetNickname,
      status: createdRequest.status,
      updatedAt: createdRequest.updatedAt,
    });
  }
}
