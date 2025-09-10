import { Decimal } from '@prisma/client/runtime/library';
import { createHmac } from 'crypto';

export function calculateWebhookSignature(
  payload: Record<string, any>,
  timestamp: string,
  signatureKey: string,
): string {
  return createHmac('sha256', signatureKey)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');
}

export type GamanzaRank =
  | 'Rank Bronze'
  | 'Rank Silver'
  | 'Rank Gold'
  | 'Rank Platinum'
  | 'Rank Diamond'
  | 'Rank Black';

type GamanzaBenefits = {
  withdrawalLimit: number;
  cashbackBonus: Decimal;
  refillBonus: Decimal;
};

export const gamanzaBenefits: Record<GamanzaRank, GamanzaBenefits> = {
  'Rank Bronze': {
    withdrawalLimit: 100,
    cashbackBonus: new Decimal(1),
    refillBonus: new Decimal(1),
  },
  'Rank Silver': {
    withdrawalLimit: 100,
    cashbackBonus: new Decimal(2),
    refillBonus: new Decimal(2),
  },
  'Rank Gold': {
    withdrawalLimit: 200,
    cashbackBonus: new Decimal(3),
    refillBonus: new Decimal(3),
  },
  'Rank Platinum': {
    withdrawalLimit: 300,
    cashbackBonus: new Decimal(5),
    refillBonus: new Decimal(5),
  },
  'Rank Diamond': {
    withdrawalLimit: 500,
    cashbackBonus: new Decimal(7),
    refillBonus: new Decimal(7),
  },
  'Rank Black': {
    withdrawalLimit: 1000,
    cashbackBonus: new Decimal(10),
    refillBonus: new Decimal(10),
  },
};
