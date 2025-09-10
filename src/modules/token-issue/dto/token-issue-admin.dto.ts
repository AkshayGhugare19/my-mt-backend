import { TokenIssueSchema } from '@modules/token-issue/dto/token-issue.dto';
import {
  TokenIssueRequestWithEmails,
  TokenIssueWithRequester,
} from '@modules/token-issue/types';
import { decimalToNumber } from '@utils/decimal-do-number';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const TokenIssueAdminSchema = TokenIssueSchema.omit({
  status: true,
}).extend({
  createdAt: z.date(),
  updatedAt: z.date().nullable().optional(),
  amount: z.number(),
  targetEmail: z.string(),
  targetNickname: z.string().optional(),
  targetId: z.string().optional(),
  prepaid: z.number().optional(),
  paymentType: z.enum(['cash', 'usdt']).optional(),
  proof: z.string().optional(),
  status: z.string(),
  masterEmail: z.string().optional(),
  masterNickname: z.string().optional(),
  masterId: z.string().optional(),
  userBookieStake: z.number(),
  predefinedBookieStake: z.number().optional(),
  flexibleBookieStake: z.number().optional(),
});

export class TokenIssueAdminDto extends createZodDto(TokenIssueAdminSchema) {
  constructor(data: TokenIssueAdminDto) {
    super();
    Object.assign(this, data);
  }

  static from(tokenIssue: TokenIssueRequestWithEmails): TokenIssueAdminDto {
    return new TokenIssueAdminDto({
      amount: decimalToNumber(tokenIssue.amount),
      id: tokenIssue.id,
      targetEmail: tokenIssue.targetEmail,
      createdAt: tokenIssue.createdAt,
      paymentType: (tokenIssue.paymentType as 'cash' | 'usdt') || undefined,
      prepaid: tokenIssue.prepaidPercent || undefined,
      proof: tokenIssue.proof || undefined,
      status: tokenIssue.status,
      updatedAt: tokenIssue.updatedAt,
      masterEmail: tokenIssue.masterEmail,
      masterNickname: tokenIssue.masterNickname,
      targetNickname: tokenIssue.targetNickname,
      masterId: tokenIssue.masterId,
      targetId: tokenIssue.requesterId,
      userBookieStake: tokenIssue.userBookieStake || 0,
      flexibleBookieStake: tokenIssue.flexibleBookieStake,
      predefinedBookieStake: tokenIssue.predefinedBookieStake,
    });
  }

  static fromTokenIssueWithRequester(
    request: TokenIssueWithRequester,
  ): TokenIssueAdminDto {
    return new TokenIssueAdminDto({
      amount: decimalToNumber(request.amount),
      createdAt: request.createdAt,
      id: request.id,
      status: request.status,
      updatedAt: request.updatedAt,
      paymentType: (request.paymentType as 'cash' | 'usdt') || undefined,
      prepaid: request.prepaidPercent || undefined,
      proof: request.proof || undefined,
      targetEmail: request.requester.email!,
      masterEmail: request.master.email!,
      masterNickname: request.master.nickname!,
      targetNickname: request.requester.nickname!,
      targetId: request.requesterId,
      masterId: request.masterId,
      userBookieStake: decimalToNumber(request.requester.userBookieStake) || 0,
      flexibleBookieStake: decimalToNumber(
        request.requester.flexibleBookieStake,
      ),
      predefinedBookieStake: decimalToNumber(
        request.requester.predefinedBookieStake,
      ),
    });
  }
}
