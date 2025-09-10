/* eslint-disable sonarjs/no-duplicate-string */
import { NotificationCodes } from '@infrastructure/database/prisma/constants';

export const NotificationCodeToI18nTitle: { [k: string]: string } = {
  [NotificationCodes.BALANCE_ADJUSTED]: 'notifications.balance.adjusted.title',
  [NotificationCodes.BONUS_RECEIVED]: 'notifications.bonus.received.title',
  [NotificationCodes.BONUS_ROLLOVER_STARTED]:
    'notifications.bonus.rollover_started.title',
  [NotificationCodes.DEPOSIT_SUCCESS]: 'notifications.deposit.success.title',
  [NotificationCodes.TOPUP_REQUEST_CREATED]:
    'notifications.topup_request.created.title',
  [NotificationCodes.TOPUP_REQUEST_APPROVED]:
    'notifications.topup_request.approved.title',
  [NotificationCodes.TOPUP_REQUEST_REJECTED]:
    'notifications.topup_request.rejected.title',
  [NotificationCodes.SETLLEMENT_REQUEST_CREATED_BY_USER]:
    'notifications.settlement_request.created_by_user.title',
  [NotificationCodes.SETLLEMENT_REQUEST_CREATED_BY_SUPERMASTER]:
    'notifications.settlement_request.created_by_supermaster.title',
  [NotificationCodes.WITHDRAWAL_REQUEST_CREATED]:
    'notifications.withdrawal_request.created.title',
  [NotificationCodes.WITHDRAWAL_REQUEST_APPROVED]:
    'notifications.withdrawal_request.approved.title',
  [NotificationCodes.WITHDRAWAL_REQUEST_COMPLETED]:
    'notifications.withdrawal_request.completed.title',
  [NotificationCodes.WITHDRAWAL_REQUEST_REJECTED]:
    'notifications.withdrawal_request.rejected.title',
  [NotificationCodes.WITHDRAWAL_REQUEST_FAILED]:
    'notifications.withdrawal_request.failed.title',
  [NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_USDT_BALANCE]:
    'notifications.warning.tron_withdrawal_wallet_usdt_balance.title',
  [NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_USDC_BALANCE]:
    'notifications.warning.tron_withdrawal_wallet_usdc_balance.title',
  [NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_TRX_BALANCE]:
    'notifications.warning.tron_withdrawal_wallet_trx_balance.title',
  [NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_USDT_BALANCE]:
    'notifications.warning.solana_withdrawal_wallet_usdt_balance.title',
  [NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_USDC_BALANCE]:
    'notifications.warning.solana_withdrawal_wallet_usdc_balance.title',
  [NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_SOL_BALANCE]:
    'notifications.warning.solana_withdrawal_wallet_sol_balance.title',
  [NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDT_BALANCE]:
    'notifications.warning.ethereum_withdrawal_wallet_usdt_balance.title',
  [NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDC_BALANCE]:
    'notifications.warning.ethereum_withdrawal_wallet_usdc_balance.title',
  [NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_ETH_BALANCE]:
    'notifications.warning.ethereum_withdrawal_wallet_eth_balance.title',
  [NotificationCodes.POKER_CODE_DISTRIBUTED]:
    'notifications.poker_code.distributed.title',
  [NotificationCodes.TIP_RECEIVED]: 'notifications.tip.received.title',
  [NotificationCodes.REWARD_RECEIVED]: 'notifications.reward.received.title',
} as const;

export const NotificationCodeToI18nMessage: { [k: string]: string } = {
  [NotificationCodes.BALANCE_ADJUSTED]:
    'notifications.balance.adjusted.message',
  [NotificationCodes.BONUS_RECEIVED]: 'notifications.bonus.received.message',
  [NotificationCodes.BONUS_ROLLOVER_STARTED]:
    'notifications.bonus.rollover_started.message',
  [NotificationCodes.DEPOSIT_SUCCESS]: 'notifications.deposit.success.message',
  [NotificationCodes.TOPUP_REQUEST_CREATED]:
    'notifications.topup_request.created.message',
  [NotificationCodes.TOPUP_REQUEST_APPROVED]:
    'notifications.topup_request.approved.message',
  [NotificationCodes.TOPUP_REQUEST_REJECTED]:
    'notifications.topup_request.rejected.message',
  [NotificationCodes.SETLLEMENT_REQUEST_CREATED_BY_USER]:
    'notifications.settlement_request.created_by_user.message',
  [NotificationCodes.SETLLEMENT_REQUEST_CREATED_BY_SUPERMASTER]:
    'notifications.settlement_request.created_by_supermaster.message',
  [NotificationCodes.WITHDRAWAL_REQUEST_CREATED]:
    'notifications.withdrawal_request.created.message',
  [NotificationCodes.WITHDRAWAL_REQUEST_APPROVED]:
    'notifications.withdrawal_request.approved.message',
  [NotificationCodes.WITHDRAWAL_REQUEST_COMPLETED]:
    'notifications.withdrawal_request.completed.message',
  [NotificationCodes.WITHDRAWAL_REQUEST_REJECTED]:
    'notifications.withdrawal_request.rejected.message',
  [NotificationCodes.WITHDRAWAL_REQUEST_FAILED]:
    'notifications.withdrawal_request.failed.message',
  [NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_USDT_BALANCE]:
    'notifications.warning.tron_withdrawal_wallet_usdt_balance.message',
  [NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_USDC_BALANCE]:
    'notifications.warning.tron_withdrawal_wallet_usdc_balance.message',
  [NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_TRX_BALANCE]:
    'notifications.warning.tron_withdrawal_wallet_trx_balance.message',
  [NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_USDT_BALANCE]:
    'notifications.warning.solana_withdrawal_wallet_usdt_balance.message',
  [NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_USDC_BALANCE]:
    'notifications.warning.solana_withdrawal_wallet_usdc_balance.message',
  [NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_SOL_BALANCE]:
    'notifications.warning.solana_withdrawal_wallet_sol_balance.message',
  [NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDT_BALANCE]:
    'notifications.warning.ethereum_withdrawal_wallet_usdt_balance.message',
  [NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDC_BALANCE]:
    'notifications.warning.ethereum_withdrawal_wallet_usdc_balance.message',
  [NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_ETH_BALANCE]:
    'notifications.warning.ethereum_withdrawal_wallet_eth_balance.message',
  [NotificationCodes.POKER_CODE_DISTRIBUTED]:
    'notifications.poker_code.distributed.message',
  [NotificationCodes.TIP_RECEIVED]: 'notifications.tip.received.message',
  [NotificationCodes.REWARD_RECEIVED]: 'notifications.reward.received.message',
} as const;

export const NotificationCodeToUrl: { [k: string]: string } = {
  [NotificationCodes.WITHDRAWAL_REQUEST_REJECTED]: '/token-withdrawal',
  [NotificationCodes.WITHDRAWAL_REQUEST_CREATED]: '/token-withdrawal',
  [NotificationCodes.WITHDRAWAL_REQUEST_APPROVED]: '/token-withdrawal',
  [NotificationCodes.WITHDRAWAL_REQUEST_COMPLETED]: '/token-withdrawal',
  [NotificationCodes.WITHDRAWAL_REQUEST_FAILED]: '/token-withdrawal',
} as const;
