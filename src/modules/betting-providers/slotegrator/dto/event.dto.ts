import { z } from 'zod';

export const SlotegratorEventBalanceActionSchema = z.object({
  action: z.literal('balance'),
  player_id: z.string(),
  currency: z.string(), // TODO: should be enum
  session_id: z.string().optional(),
});

export type SlotegratorEventBalanceAction = z.infer<
  typeof SlotegratorEventBalanceActionSchema
>;

export const SlotegratorEventBetActionSchema = z.object({
  action: z.literal('bet'),
  amount: z.coerce.number(),
  currency: z.string(), // TODO: should be enum,
  game_uuid: z.string(),
  player_id: z.string(),
  transaction_id: z.string(),
  session_id: z.string().optional(),
  type: z.string(),
  round_id: z.string().optional(),
  finished: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .transform((arg) => {
      if (typeof arg === 'undefined') {
        return undefined;
      }

      if (typeof arg === 'string') {
        return arg === '1';
      }

      if (typeof arg === 'number') {
        return arg === 1;
      }

      if (typeof arg === 'boolean') {
        return arg;
      }
    }),
});

export type SlotegratorEventBetAction = z.infer<
  typeof SlotegratorEventBetActionSchema
>;

export const SlotegratorEventWinActionSchema = z.object({
  action: z.literal('win'),
  amount: z.coerce.number(),
  currency: z.string(), // TODO: should be enum,
  game_uuid: z.string(),
  player_id: z.string(),
  transaction_id: z.string(),
  session_id: z.string().optional(),
  type: z.string(),
  round_id: z.string().optional(),
  finished: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .transform((arg) => {
      if (typeof arg === 'undefined') {
        return undefined;
      }

      if (typeof arg === 'string') {
        return arg === '1';
      }

      if (typeof arg === 'number') {
        return arg === 1;
      }

      if (typeof arg === 'boolean') {
        return arg;
      }
    }),
});

export type SlotegratorEventWinAction = z.infer<
  typeof SlotegratorEventWinActionSchema
>;

export const SlotegratorEventRefundActionSchema = z.object({
  action: z.literal('refund'),
  amount: z.coerce.number(),
  currency: z.string(), // TODO: should be enum,
  game_uuid: z.string(),
  player_id: z.string(),
  transaction_id: z.string(),
  session_id: z.string().optional(),
  type: z.string().optional(),
  bet_transaction_id: z.string(),
  round_id: z.string().optional(),
  finished: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .transform((arg) => {
      if (typeof arg === 'undefined') {
        return undefined;
      }

      if (typeof arg === 'string') {
        return arg === '1';
      }

      if (typeof arg === 'number') {
        return arg === 1;
      }

      if (typeof arg === 'boolean') {
        return arg;
      }
    }),
});

export type SlotegratorEventRefundAction = z.infer<
  typeof SlotegratorEventRefundActionSchema
>;

export const SlotegratorEventRollbackActionSchema = z.object({
  action: z.literal('rollback'),
  currency: z.string(), // TODO: should be enum,
  game_uuid: z.string(),
  player_id: z.string(),
  transaction_id: z.string(),
  rollback_transactions: z
    .object({
      action: z.enum(['bet', 'win', 'refund']),
      transaction_id: z.string(),
      amount: z.coerce.number(),
    })
    .array(),
  session_id: z.string().optional(),
});

export type SlotegratorEventRollbackAction = z.infer<
  typeof SlotegratorEventRollbackActionSchema
>;

export const SlotegratorEventSchemaBase = z.object({
  action: z.enum(['balance', 'bet', 'win', 'refund', 'rollback']),
});

export const SlotegratorEventResultErrorSchema = z.object({
  error_code: z.string(),
  error_description: z.string(),
});

export type SlotegratorEventResultError = z.infer<
  typeof SlotegratorEventResultErrorSchema
>;

export const SlotegratorEventResultBalanceSchema = z.object({
  balance: z.number().positive(),
});

export type SlotegratorEventResultBalance = z.infer<
  typeof SlotegratorEventResultBalanceSchema
>;

export const SlotegratorEventResultBetSchema = z.object({
  balance: z.number().positive(),
  transaction_id: z.string(),
});

export type SlotegratorEventResultBet = z.infer<
  typeof SlotegratorEventResultBetSchema
>;

export const SlotegratorEventResultWinSchema = z.object({
  balance: z.number().positive(),
  transaction_id: z.string(),
});

export type SlotegratorEventResultwin = z.infer<
  typeof SlotegratorEventResultWinSchema
>;

export const SlotegratorEventResultRefundSchema = z.object({
  balance: z.number().positive(),
  transaction_id: z.string(),
});

export type SlotegratorEventResultRefund = z.infer<
  typeof SlotegratorEventResultRefundSchema
>;

export const SlotegratorEventResultRollbackSchema = z.object({
  balance: z.number().positive(),
  transaction_id: z.string(),
  rollback_transactions: z.string().array(),
});

export type SlotegratorEventResultRollback = z.infer<
  typeof SlotegratorEventResultRollbackSchema
>;

export const SlotegratorEventResultSchema = z.union([
  SlotegratorEventResultErrorSchema,
  SlotegratorEventResultBalanceSchema,
  SlotegratorEventResultBetSchema,
  SlotegratorEventResultWinSchema,
  SlotegratorEventResultRefundSchema,
  SlotegratorEventResultRollbackSchema,
]);

export type SlotegratorEventResult = z.infer<
  typeof SlotegratorEventResultSchema
>;

export const SlotegratorSportsBookBalanceRequestSchema = z.object({
  action: z.literal('balance'),
  player_id: z.string(),
  currency: z.string(),
  session_id: z.string().optional(),
});

export type SlotegratorSportsBookBalanceRequest = z.infer<
  typeof SlotegratorSportsBookBalanceRequestSchema
>;

export const SlotegratorSportsBookBalanceResponseSchema = z.object({
  balance: z.number().positive(),
});

export type SlotegratorSportsBookBalanceResponse = z.infer<
  typeof SlotegratorSportsBookBalanceResponseSchema
>;

export const SlotegratorSportsBookBetslipBetItemSchema = z.object({
  event_id: z.string(),
  uuid: z.string(),
  parameters: z.any(), // TODO: define BetItemParameters
  status: z.union([z.string(), z.number()]).optional(),
  provider_uuid: z.string().optional(),
});

export type SlotegratorSportsBookBetslipBetItem = z.infer<
  typeof SlotegratorSportsBookBetslipBetItemSchema
>;

export const SlotegratorSportsBookBetslipSchema = z.object({
  amount: z.coerce.number(),
  currency: z.string(),
  items: SlotegratorSportsBookBetslipBetItemSchema.array(),
  parameters: z.any(), // TODO: define BetslipParameters
  provider_betslip_id: z.string(),
  status: z.string(),
  uuid: z.string(),
});

export type SlotegratorSportsBookBetslip = z.infer<
  typeof SlotegratorSportsBookBetslipSchema
>;

export const SlotegratorSportsBookBetRequestSchema = z.object({
  action: z.literal('bet'),
  amount: z.coerce.number(),
  betslip: SlotegratorSportsBookBetslipSchema,
  betslip_id: z.string(),
  currency: z.string(),
  player_id: z.string(),
  session_id: z.string().optional(),
  sportsbook_uuid: z.string(),
  transaction_id: z.string(),
});

export type SlotegratorSportsBookBetRequest = z.infer<
  typeof SlotegratorSportsBookBetRequestSchema
>;

export const SlotegratorSportsBookCommitRequestSchema = z.object({
  amount: z.coerce.number(),
  currency: z.string(),
  sportsbook_uuid: z.string(),
  player_id: z.string(),
  session_id: z.string().optional(),
  betslip_id: z.string(),
  bet_transaction_id: z.string().optional(),
  betslip: SlotegratorSportsBookBetslipSchema,
  transaction_id: z.string(),
  action: z.literal('commit'),
});

export type SlotegratorSportsBookCommitRequest = z.infer<
  typeof SlotegratorSportsBookCommitRequestSchema
>;

export const SlotegratorSportsBookBetResponseSchema = z.object({
  balance: z.number().positive(),
  transaction_id: z.string(),
});

export type SlotegratorSportsBookBetResponse = z.infer<
  typeof SlotegratorSportsBookBetResponseSchema
>;

export const SlotegratorSportsBookCommitResponseSchema = SlotegratorSportsBookBetResponseSchema.pick({
  balance: true,
})

export type SlotegratorSportsBookCommitResponse = z.infer<
  typeof SlotegratorSportsBookCommitResponseSchema
>;

export const SlotegratorSportsBookWinRequestSchema = z.object({
  action: z.literal('win'),
  amount: z.coerce.number(),
  betslip: SlotegratorSportsBookBetslipSchema,
  betslip_id: z.string(),
  bet_transaction_id: z.string().optional(),
  currency: z.string(),
  player_id: z.string(),
  session_id: z.string().optional(),
  sportsbook_uuid: z.string(),
  transaction_id: z.string(),
});

export type SlotegratorSportsBookWinRequest = z.infer<
  typeof SlotegratorSportsBookWinRequestSchema
>;

export const SlotegratorSportsBookWinResponseSchema = z.object({
  balance: z.number().positive(),
  transaction_id: z.string(),
});

export type SlotegratorSportsBookWinResponse = z.infer<
  typeof SlotegratorSportsBookWinResponseSchema
>;

export const SlotegratorSportsBookRefundRequestSchema = z.object({
  action: z.literal('refund'),
  amount: z.coerce.number(),
  betslip_id: z.string(),
  currency: z.string(),
  player_id: z.string(),
  ref_transaction_id: z.string(),
  session_id: z.string().optional(),
  sportsbook_uuid: z.string(),
  transaction_id: z.string(),
  type: z.string(),
});

export type SlotegratorSportsBookRefundRequest = z.infer<
  typeof SlotegratorSportsBookRefundRequestSchema
>;

export const SlotegratorSportsBookRefundResponseSchema = z.object({
  balance: z.number().positive(),
  transaction_id: z.string(),
});

export type SlotegratorSportsBookRefundResponse = z.infer<
  typeof SlotegratorSportsBookRefundResponseSchema
>;

export const SlotegratorSportsBookRollbackRequestSchema = z.object({
  action: z.literal('rollback'),
  amount: z.coerce.number(),
  bet_transaction_id: z.string(),
  betslip_id: z.string(),
  currency: z.string(),
  parent_transaction_id: z.string(),
  player_id: z.string(),
  transaction_id: z.string(),
});

export type SlotegratorSportsBookRollbackRequest = z.infer<
  typeof SlotegratorSportsBookRollbackRequestSchema
>;

export const SlotegratorSportsBookRollbackResponseSchema = z.object({
  balance: z.number().positive(),
  transaction_id: z.string(),
});

export type SlotegratorSportsBookRollbackResponse = z.infer<
  typeof SlotegratorSportsBookRollbackResponseSchema
>;

export const SlotegratorSportsBookCloseRequestSchema = z.object({
  action: z.literal('close'),
  session_id: z.string(),
});

export type SlotegratorSportsBookCloseRequest = z.infer<
  typeof SlotegratorSportsBookCloseRequestSchema
>;

export const SlotegratorSportsBookCloseResponseSchema = z.object({});

export type SlotegratorSportsBookCloseResponse = z.infer<
  typeof SlotegratorSportsBookCloseResponseSchema
>;

export const SlotegratorSportsBookSettlementRequestSchema = z.object({
  action: z.literal('settle'),
  betslip_id: z.string(),
  bet_transaction_id: z.string().optional(),
  currency: z.string(),
  player_id: z.string(),
});

export type SlotegratorSportsBookSettlementRequest = z.infer<
  typeof SlotegratorSportsBookSettlementRequestSchema
>;

export const SlotegratorSportsBookSettlementResponseSchema = z.object({
  balance: z.number().positive(),
  status: z.enum(['open', 'settled']),
});

export type SlotegratorSportsBookSettlementResponse = z.infer<
  typeof SlotegratorSportsBookSettlementResponseSchema
>;
