import { GenericExtendedBetDetailsSchema } from '@modules/admin/dtos/generic-extended-bet-details.dto';
import { SportsbookExtendedBetReportItem } from '@modules/admin/types';
import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

const SportsbookExtendedBetDetailsSchema =
  GenericExtendedBetDetailsSchema.extend({
    type: z.string(),
    isCashOut: z.boolean(),
    betId: z.string(),
    status: z.string(),
    game: z.string().optional(),
    transactionId: z.string().optional(),
    data: z
      .object({
        id: z.string(),
        live: z.boolean(),
        odds: z.string(),
        eventId: z.string(),
        sportId: z.string(),
        scheduled: z.number(),
        sportName: z.string(),
        categoryId: z.string(),
        marketName: z.string(),
        outcomeName: z.string(),
        categoryName: z.string(),
        tournamentId: z.string(),
        competitorName: z.array(z.string()),
        tournamentName: z.string(),
        status: z.string(),
      })
      .array(),
    potentialWin: z.number().optional(),
    potentialComboboostWin: z.number().optional(),
  });

export class SportsbookExtendedBetDetailsDto extends createZodDto(
  SportsbookExtendedBetDetailsSchema,
) {
  constructor(data: SportsbookExtendedBetDetailsDto) {
    super();
    if (data) Object.assign(this, data);
  }

  static from(
    data: SportsbookExtendedBetReportItem,
  ): SportsbookExtendedBetDetailsDto {
    return new SportsbookExtendedBetDetailsDto({
      id: data.id,
      type: 'sportsbook',
      isCashOut: data.isCashOut,
      betId: data.betId,
      amount: data.amount,
      date: data.date,
      status: data.status,
      settlement: data.settlement,
      previousBalance: data.previousBalance,
      transactionId: data.transactionId,
      game: data.game,
      data: data.extraData.bets.map((bet) => ({
        id: bet.id,
        live: bet.live,
        odds: bet.odds,
        eventId: bet.event_id,
        providerId: bet.provider_uuid,
        sportId: bet.sport_id,
        scheduled: bet.scheduled,
        sportName: bet.sport_name,
        categoryId: bet.category_id,
        marketName: bet.market_name,
        outcomeName: bet.outcome_name,
        categoryName: bet.category_name,
        tournamentId: bet.tournament_id,
        competitorName: bet.competitor_name,
        tournamentName: bet.tournament_name,
        status: bet.status,
      })),
      potentialWin: data.extraData.potentialWin,
      potentialComboboostWin: data.extraData.potentialComboboostWin,
    });
  }
}
