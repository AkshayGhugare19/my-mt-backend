export const JOB = {
  WITHDRAW_TRANSACTION_JOB: 'withdraw-transaction-job',

  TRON_TRANSFER: 'tron-transfer',
  SOLANA_TRANSFER: 'solana-transfer',
  ETHEREUM_TRANSFER: 'ethereum-transfer',
  TRON_TOKEN_TRANSFER: 'tron-token-transfer',

  DELETE_USER_IMAGE: 'delete-user-image',

  SEND_FORGOT_PASSWORD_MAIL: 'send-forgot-password-mail',
  SEND_VERIFY_EMAIL_MAIL: 'send-verify-email-mail',
  SEND_TWO_FACTOR_AUTHENTICATION_CODE_MAIL:
    'send-two-factor-authentication-code-mail',
  BONUS_HANDLE_CASHBACK: 'bonus-handle-cashback',
  BONUS_HANDLE_DEPOSIT: 'bonus-handle-deposit',
  BONUS_RAKEBACK: 'bonus-rakeback',
  BONUS_WAGERING_BET_SETTLED: 'bonus-wager-bet-settled',
  BONUS_WAGERING_PROGRESS: 'bonus-wager-progress',
  BONUS_WAGERING_BET_COMPLETED: 'bonus-wager-bet-completed',
  SPORTSBOOK_PLACE_BET: 'sportsbook-place-bet',

  GAMANZA_REWARD_BONUS: 'gamanza-reward-bonus',

  POKER_CODE_DISTRIBUTION: 'poker-code-distribution',
} as const;
