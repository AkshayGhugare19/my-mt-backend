import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const EvenBetEventSchema = z.union([
  z.object({
    method: z.literal('GetBalance'),
    userId: z.string(),
    currency: z.enum(['USD']),
  }),
  z.object({
    method: z.literal('GetCash'),
    transactionId: z.string(),
    userId: z.string(),
    amount: z.number().positive(),
    currency: z.enum(['USD']),
  }),
  z.object({
    method: z.literal('ReturnCash'),
    transactionId: z.string(),
    userId: z.string(),
    amount: z.number().positive(),
    currency: z.enum(['USD']),
  }),
  z.object({
    method: z.literal('Rollback'),
    transactionId: z.string(),
    referenceTransactionId: z.string(),
    userId: z.string(),
    amount: z.number().positive(),
    currency: z.enum(['USD']),
  }),
]);

export type EvenBetEvent = z.infer<typeof EvenBetEventSchema>;

export const EvenBetResultSchema = z.object({
  balance: z.number(),
  errorCode: z.number(),
  errorDescription: z.string().optional(),
});

@ZodDto()
export class EvenBetResultDto extends createZodDto(EvenBetResultSchema) {
  constructor(data?: EvenBetResultDto) {
    super();
    if (data) Object.assign(this, data);
  }
}

export type EvenBetResult = z.infer<typeof EvenBetResultSchema>;
