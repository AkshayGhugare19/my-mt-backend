import { EnumValues } from '@common/enums/common';

export const LockKeys = {
  // Token Issue
  REQUEST_TOKEN_ISSUE: 'redlock:tokenIssue:requestTokenIssue',
  // Token Settlement
  REQUEST_TOKEN_SETTLEMENT: 'redlock:tokenSettlement:requestTokenSettlement',
  REQUEST_TOKEN_SETTLEMENT_MASTER:
    'redlock:tokenSettlement:master:requestTokenSettlement',
  UPDATE_MASTER_TOKEN_SETTLEMENT:
    'redlock:tokenSettlement:updateMasterTokenSettlement',
  RESOLVE_TOKEN_SETTLEMENT: 'redlock:tokenSettlement:resolveTokenSettlement',
  PLACE_BET_SPORTS_EXCHANGE: 'redlock:bet:placeBetSportsExchange',
  SETTLE_BET_SPORTS_EXCHANGE: 'redlock:bet:settleBetSportsExchange',
  MOVE_FUNDS_FUNGAMESS: 'redlock:bet:moveFundsFungamess',
  EVENBET_BALANCE_UPDATE: 'redlock:evenbet:balanceUpdate',
  SLOTEGRATOR_BALANCE_UPDATE_GAME_BET: 'redlock:slotegrator:balanceUpdateGameBet',
  SLOTEGRATOR_BALANCE_UPDATE_GAME_SETTLE: 'redlock:slotegrator:balanceUpdateGameSettle',
} as const;

export type LockKey = EnumValues<typeof LockKeys>;
