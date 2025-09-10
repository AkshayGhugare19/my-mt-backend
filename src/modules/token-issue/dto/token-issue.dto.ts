import { TokenIssueRequest } from '@prisma/client';
import { decimalToNumber } from '@utils/decimal-do-number';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const TokenIssueSchema = z.object({
  id: z.string(),
  amount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  status: z.string(),
});

export class TokenIssueDto extends createZodDto(TokenIssueSchema) {
  constructor(data: TokenIssueDto) {
    super();
    Object.assign(this, data);
  }

  static from(tokenIssue: TokenIssueRequest): TokenIssueDto {
    return new TokenIssueDto({
      amount: decimalToNumber(tokenIssue.amount) || 0,
      createdAt: tokenIssue.createdAt,
      id: tokenIssue.id,
      status: tokenIssue.status,
    });
  }
}
