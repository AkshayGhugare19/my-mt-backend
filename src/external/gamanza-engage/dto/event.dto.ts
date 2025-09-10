import { z } from 'zod';

export const GamanzaEngageLevelUpEventSchema = z.object({
  playerId: z.string(),
  eventName: z.literal('level_up'),
  eventDate: z.string(),
  payload: z
    .object({
      type: z.union([
        z.literal('string'),
        z.literal('number'),
        z.literal('i18n'),
        z.literal('date'),
      ]),
      key: z.union([
        z.literal('PlayerId'),
        z.literal('CurrentLevel'),
        z.literal('RewardExternalDescription'),
        z.literal('RemainingPendingLevels'),
        z.literal('CurrentRankExternalName'),
        z.literal('CurrentRankExternalDescription'),
        z.literal('XpBalance'),
        z.literal('Timestamp'),
      ]),
      value: z.union([
        z.string(),
        z.number(),
        z.object({
          languages: z.array(
            z.object({
              language: z.string(),
              value: z.string(),
            }),
          ),
        }),
      ]),
    })
    .array(),
});

export type GamanzaEngageLevelUpEvent = z.infer<
  typeof GamanzaEngageLevelUpEventSchema
>;

export const GamanzaEngageRankUpEventSchema = z.object({
  playerId: z.string(),
  eventName: z.literal('rank_up'),
  eventDate: z.string(),
  payload: z
    .object({
      type: z.union([
        z.literal('string'),
        z.literal('number'),
        z.literal('i18n'),
        z.literal('date'),
      ]),
      key: z.union([
        z.literal('PlayerId'),
        z.literal('CurrentLevel'),
        z.literal('CurrentRankExternalName'),
        z.literal('CurrentRankExternalDescription'),
        z.literal('XpBalance'),
        z.literal('Timestamp'),
      ]),
      value: z.union([
        z.string(),
        z.number(),
        z.object({
          languages: z.array(
            z.object({
              language: z.string(),
              value: z.string(),
            }),
          ),
        }),
      ]),
    })
    .array(),
});

export type GamanzaEngageRankUpEvent = z.infer<
  typeof GamanzaEngageRankUpEventSchema
>;

export const GamanzaEngageProductPurchaseEventSchema = z.object({
  playerId: z.string(),
  eventName: z.literal('product_purchase'),
  eventDate: z.string(),
  payload: z
    .object({
      key: z.string(),
      value: z.union([
        z.string(),
        z.number(),
        z.object({
          languages: z.array(
            z.object({
              language: z.string(),
              value: z.string(),
            }),
          ),
        }),
        z.date().transform((val) => new Date(val)),
      ]),
      displayValue: z.string().optional(),
      type: z.string(),
      options: z
        .array(
          z.object({
            key: z.string(),
            value: z.string(),
          }),
        )
        .optional(),
    })
    .array(),
});

export type GamanzaEngageProductPurchaseEvent = z.infer<
  typeof GamanzaEngageProductPurchaseEventSchema
>;

export const GamanzaEngageEventResultSchema = z.object({
  events: z
    .union([
      GamanzaEngageLevelUpEventSchema,
      GamanzaEngageRankUpEventSchema,
      GamanzaEngageProductPurchaseEventSchema,
    ])
    .array(),
});

export type GamanzaEngageEventResult = z.infer<
  typeof GamanzaEngageEventResultSchema
>;
