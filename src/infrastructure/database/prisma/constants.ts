import { I18nLanguageCodes } from '@infrastructure/i18n/constants';
import { Decimal } from '@prisma/client/runtime/library';

export const Blockchain = {
  Tron: 0,
  Solana: 1,
  Ethereum: 2,
  Bnb: 3,
  Arbitrum: 4,
};

export const DepositTransactionCurrency = {
  Usdt: 0,
  Solana: 1,
  Ethereum: 2,
  Trx: 3,
  Usdc: 4,
};

export const WithdrawalRequestCurrency = {
  Usdt: 0,
  Solana: 1,
  Ethereum: 2,
  Trx: 3,
  Usdc: 4,
};

export const CouponCodeType = {
  BALANCE_FLAT: 0,
};

export const NotificationCodes = {
  BALANCE_ADJUSTED: 'BALANCE_ADJUSTED',

  BONUS_RECEIVED: 'BONUS_RECEIVED',
  BONUS_ROLLOVER_STARTED: 'BONUS_ROLLOVER_STARTED',

  DEPOSIT_SUCCESS: 'DEPOSIT_SUCCESS',

  TOPUP_REQUEST_CREATED: 'TOPUP_REQUEST_CREATED',
  TOPUP_REQUEST_APPROVED: 'TOPUP_REQUEST_APPROVED',
  TOPUP_REQUEST_REJECTED: 'TOPUP_REQUEST_REJECTED',

  SETLLEMENT_REQUEST_CREATED_BY_USER: 'SETLLEMENT_REQUEST_CREATED_BY_USER',
  SETLLEMENT_REQUEST_CREATED_BY_SUPERMASTER:
    'SETLLEMENT_REQUEST_CREATED_BY_SUPERMASTER',

  WITHDRAWAL_REQUEST_CREATED: 'WITHDRAWAL_REQUEST_CREATED',
  WITHDRAWAL_REQUEST_APPROVED: 'WITHDRAWAL_REQUEST_APPROVED',
  WITHDRAWAL_REQUEST_COMPLETED: 'WITHDRAWAL_REQUEST_COMPLETED',
  WITHDRAWAL_REQUEST_REJECTED: 'WITHDRAWAL_REQUEST_REJECTED',
  WITHDRAWAL_REQUEST_FAILED: 'WITHDRAWAL_REQUEST_FAILED',

  WARNING_TRON_WITHDRAWAL_WALLET_USDT_BALANCE:
    'WARNING_TRON_WITHDRAWAL_WALLET_USDT_BALANCE',
  WARNING_TRON_WITHDRAWAL_WALLET_USDC_BALANCE:
    'WARNING_TRON_WITHDRAWAL_WALLET_USDC_BALANCE',
  WARNING_TRON_WITHDRAWAL_WALLET_TRX_BALANCE:
    'WARNING_TRON_WITHDRAWAL_WALLET_TRX_BALANCE',
  WARNING_SOLANA_WITHDRAWAL_WALLET_USDT_BALANCE:
    'WARNING_SOLANA_WITHDRAWAL_WALLET_USDT_BALANCE',
  WARNING_SOLANA_WITHDRAWAL_WALLET_USDC_BALANCE:
    'WARNING_SOLANA_WITHDRAWAL_WALLET_USDC_BALANCE',
  WARNING_SOLANA_WITHDRAWAL_WALLET_SOL_BALANCE:
    'WARNING_SOLANA_WITHDRAWAL_WALLET_SOL_BALANCE',
  WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDT_BALANCE:
    'WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDT_BALANCE',
  WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDC_BALANCE:
    'WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDC_BALANCE',
  WARNING_ETHEREUM_WITHDRAWAL_WALLET_ETH_BALANCE:
    'WARNING_ETHEREUM_WITHDRAWAL_WALLET_ETH_BALANCE',
  POKER_CODE_DISTRIBUTED: 'POKER_CODE_DISTRIBUTED',

  TIP_RECEIVED: 'TIP_RECEIVED',
  REWARD_RECEIVED: 'REWARD_RECEIVED',
} as const;
export type NotificationCode =
  (typeof NotificationCodes)[keyof typeof NotificationCodes];

export function getAmountInCurrencyString(
  amount: number | Decimal,
  currency: number,
  blockchain: number,
): string | undefined {
  let currencyName = Object.keys(WithdrawalRequestCurrency).find(
    (key) =>
      WithdrawalRequestCurrency[
        key as keyof typeof WithdrawalRequestCurrency
      ] === currency,
  );

  if (!currencyName) {
    return `${amount}`;
  }

  if (currency === WithdrawalRequestCurrency.Usdt || currency === WithdrawalRequestCurrency.Usdc) {
    if (blockchain === Blockchain.Tron) {
      currencyName += ' (Tron)';
    }
    if (blockchain === Blockchain.Ethereum) {
      currencyName += ' (Ethereum)';
    }

    if (blockchain === Blockchain.Solana) {
      currencyName += ' (Solana)';
    }
  }

  return `${amount} ${currencyName}`;
}

export const UserPreferencesLanguages = I18nLanguageCodes;

export const UserPreferencesExchangeWidgetPairs = {
  UsdtUsd: 'usdt_usd',
  UsdtEur: 'usdt_eur',
  UsdtPhp: 'usdt_php',
  UsdcUsd: 'usdc_usd',
  UsdcEur: 'usdc_eur',
  UsdcPhp: 'usdc_php',
};

export const PRISMA_TRANSACTION_MANAGER_KEY = 'prisma-transaction-manager';
export const PRISMA_TRANSACTION_MANAGER_HOOKS_KEY =
  'prisma-transaction-manager-hooks';
