export const Permissions = {
  // !Roles
  // READ
  READ_ROLES: 'read_roles',

  // !Permissions
  // READ
  READ_PERMISSIONS: 'read_permissions',

  // EDIT
  EDIT_PERMISSIONS: 'edit_permissions',

  // !SUPER MASTER
  READ_SUPER_MASTER_DETAILS: 'read_supermaster_details',

  // !Master
  // READ
  READ_MASTER: 'read_master',
  READ_MASTER_OWN_DETAILS: 'read_master_own_details',
  READ_MASTER_PNL: 'read_master_pnl',
  READ_MASTER_NUMBERUSERS: 'read_master_nrusers',
  READ_MASTER_MAXEXPOSUREPERVIP: 'read_master_maxexposurepervip',
  READ_MASTER_MAXNUMBERUSERS: 'read_master_maxnumberusers',

  // CREATE
  CREATE_MASTER: 'create_master',

  // EDIT
  EDIT_MASTER_MAXEXPOSUREPERVIP: 'edit_master_maxexposurepervip',
  EDIT_MASTER_MAXNUMBERUSERS: 'edit_master_maxnumberusers',

  // !User
  // READ
  READ_USER: 'read_user',
  READ_ALL_USER: 'read_all_user',
  READ_LIVE_USERS: 'read_live_user',
  READ_USER_DETAILS: 'read_user_details',
  READ_USER_MAXBET: 'read_user_maxbet',
  READ_USER_WITHDRAWAL_AVAILABILITY: 'read_user_withdrawal_availability',
  EDIT_USER_WITHDRAWAL_AVAILABILITY: 'edit_user_withdrawal_availability',
  READ_BLOCKED_USERS: 'read_blocked_users',

  // EDIT
  EDIT_USER_MAXBET: 'edit_user_maxbet',
  EDIT_VIP_MAXBET: 'edit_vip_maxbet',
  EDIT_PASSWORD: 'edit_password',
  EDIT_OWN_VIP_PASSWORD: 'edit_own_vip_password',
  EDIT_OWN_PASSWORD: 'edit_own_password',
  BLOCK_USER: 'block_user',

  // !VIP
  READ_VIP: 'read_vip',
  READ_VIP_OWN: 'read_vip_own',
  READ_VIP_DETAILS: 'read_vip_details',
  READ_VIP_MAXBET: 'read_vip_maxbet',
  READ_BLOCKED_VIP_OWN: 'read_blocked_vip_own',
  BLOCK_VIP_OWN: 'block_vip_own',

  // CREATE
  CREATE_VIP: 'create_vip',

  // EDIT
  EDIT_VIP_PREFERENCES: 'edit_vip_preferences',
  EDIT_OWN_VIP_PREFERENCES: 'edit_own_vip_preferences',

  EDIT_VIP_BONUS_PREFERENCES: 'edit_vip_bonus_preferences',

  // !Admin
  // READ
  READ_OWN_PROFILE: 'read_own_profile',

  // Wallet

  // READ
  READ_DEPOSIT_WALLET: 'read_deposit_wallet',
  READ_WITHDRAWAL_WALLET: 'read_withdrawal_wallet',
  READ_SETTLEMENT_WALLET: 'read_settlement_wallet',
  READ_OWN_WALLET: 'read_own_wallet',

  // EDIT
  EDIT_SECRET: 'edit_secret',
  EDIT_OWN_WALLET: 'edit_own_wallet',

  // !Balance
  // READ
  READ_OWN_BALANCE: 'read_own_balance',
  READ_BALANCE_ADJUSTMENTS: 'read_balance_adjustments',
  READ_OWN_BALANCE_ADJUSTMENTS: 'read_own_balance_adjustments',

  // EDIT
  EDIT_BALANCE: 'edit_balance',

  // !Bonus
  // READ
  READ_BONUS: 'read_bonus',
  READ_USER_BONUS: 'read_user_bonus',
  READ_OWN_USER_BONUS: 'read_own_user_bonus',

  // CREATE
  CREATE_BONUS: 'create_bonus',

  // EDIT
  EDIT_BONUS: 'edit_bonus',
  EDIT_USER_BONUS: 'edit_user_bonus',

  // !Withdrawal
  // READ
  READ_WITHDRAWAL: 'read_withdrawal',

  // EDIT
  EDIT_WITHDRAWAL: 'edit_withdrawal',

  // SPECIAL
  CLOSE_WITHDRAWAL: 'close_withdrawal',
  BLOCK_USER_WITHDRAWAL: 'block_user_withdrawal',

  // !Risk Management
  // READ
  READ_RISK_MANAGEMENT: 'read_risk_management',

  // CREATE
  CREATE_RISK_MANAGEMENT: 'create_risk_management',

  // !Marketing
  // READ
  READ_MARKETING: 'read_marketing',

  // CREATE
  CREATE_MARKETING: 'create_marketing',

  // !Marketing
  // READ
  READ_PARTNER: 'read_partner',

  // CREATE
  CREATE_PARTNER: 'create_partner',

  // !Customer Support
  // READ
  READ_CUSTOMER_SUPPORT: 'read_customer_support',
  READ_CUSTOMER_SUPPORT_TICKET: 'read_customer_support_ticket',

  // CREATE
  CREATE_CUSTOMER_SUPPORT: 'create_customer_support',

  // !Accountant
  // READ
  READ_ACCOUNTANT: 'read_accountant',

  // CREATE
  CREATE_ACCOUNTANT: 'create_accountant',

  // !Settlement
  // READ
  READ_SETTLEMENTS: 'read_settlements',
  READ_SETTLEMENTS_VIPS: 'read_settlements_vip',
  READ_SETTLEMENTS_SMM: 'read_settlements_smm',
  READ_SETTLEMENTS_SMM_OWN: 'read_settlements_smm_own',

  // CREATE
  CREATE_SETTLEMENTS_VIPS: 'create_settlements_vip',
  CREATE_SETTLEMENTS_SMM: 'create_settlements_smm',
  CREATE_SETTLEMENTS_SMM_OWN: 'create_settlements_smm_own',

  // EDIT
  EDIT_SETTLEMENTS_VIPS: 'edit_settlements_vip',
  EDIT_SETTLEMENTS_SMM: 'edit_settlements_smm',
  EDIT_SETTLEMENTS_SMM_OWN: 'edit_settlements_smm_own',

  // !Statistics
  // READ
  READ_DASHBOARD: 'read_dashboard',
  READ_STATISTICS: 'read_statistics',
  READ_STATISTICS_VIP: 'read_statistics_vip',
  READ_STATISTICS_USER: 'read_statistics_user',
  READ_NGR: 'read_ngr',
  READ_FUNGAMESS_GGR: 'read_fungamess_ggr',
  READ_SPORTS_EXCHANGE_GGR: 'read_sports_exchange_ggr',
  READ_POKER_GGR: 'read_poker_ggr',
  READ_STATISTICS_USER_ACTIVITY: 'read_statistics_user_activity',
  READ_STATISTICS_VIP_OWN_ACTIVITY: 'read_statistics_vip_own_activity',
  READ_STATISTICS_FUNDS_USER: 'read_statistics_funds_user',
  READ_STATISTICS_FUNDS_VIP_OWN: 'read_statistics_funds_vip_own',
  READ_STATISTICS_FUNDS_DEPOSIT: 'read_statistics_funds_deposit',
  READ_STATISTICS_FUNDS_VOLUME: 'read_statistics_funds_volume',
  READ_STATISTICS_FUNDS_VIP_OWN_VOLUME: 'read_statistics_funds_vip_own_volume',
  READ_STATISTICS_FUNDS_WITHDRAWAL: 'read_statistics_funds_withdrawal',
  READ_STATISTICS_FUNDS_TOKEN_ISSUE: 'read_statistics_funds_token_issue',
  READ_STATISTICS_FUNDS_OWN_VIP_TOKEN_ISSUE:
    'read_statistics_funds_own_vip_token_issue',
  READ_STATISTICS_FUNDS_OWN_TOKEN_SETTLEMENT:
    'read_statistics_funds_own_token_settlement',
  READ_STATISTICS_FUNDS_TOKEN_SETTLEMENT:
    'read_statistics_funds_token_settlement',

  // !Token
  // READ
  READ_TOKEN_REQUESTS: 'read_token_requests',
  READ_TOKEN_REQUESTS_VIP: 'read_token_requests_vip',
  READ_TOKEN_REQUESTS_MASTER: 'read_token_requests_master',
  READ_TOKEN_WITHDRAWAL: 'read_token_withdrawal',

  // EDIT
  EDIT_TOKEN_REQUESTS_VIP: 'edit_token_requests_vip',
  EDIT_TOKEN_REQUESTS_MASTER: 'edit_token_requests_master',

  // CREATE
  CREATE_TOKEN_REQUESTS_VIP: 'create_token_requests_vip', // by master
  CREATE_TOKEN_REQUESTS_MASTER: 'create_token_requests_master', // by supermaster
  CREATE_TOKEN_REQUESTS_MASTER_OWN: 'create_token_requests_master_own', // by master

  // !Reports
  // READ
  READ_DEPOSITS_REPORTS: 'read_deposits_reports',
  READ_WITHDRAWALS_REPORTS: 'read_withdrawals_reports',
  READ_BETS_REPORTS: 'read_bets_reports',
  READ_OWN_BETS_REPORTS: 'read_own_bets_reports',
  READ_SETTLEMENTS_REPORTS: 'read_settlements_reports',
  READ_OWN_SETTLEMENTS_REPORTS: 'read_own_settlements_reports',
  READ_TOP_UPS_REPORTS: 'read_top_ups_reports',
  READ_OWN_TOP_UPS_REPORTS: 'read_own_top_ups_reports',

  // !Live Bets
  // READ
  READ_LIVE_BETS: 'read_live_bets',
  READ_OWN_LIVE_BETS: 'read_own_live_bets',

  // !Transactions Evenbet
  // READ
  READ_EVENBET_TRANSACTIONS: 'read_evenbet_transactions',

  // !Poker rake
  // CREATE
  CREATE_POKER_RAKE: 'create_poker_rake',
  // READ
  READ_POKER_RAKE: 'read_poker_rake',

  // !Parameters
  // READ
  READ_PARAMETERS: 'read_parameters',
  EDIT_PARAMETERS: 'edit_parameters',

  // !Poker Codes
  READ_POKER_CODES: 'read_poker_codes',
  CREATE_POKER_CODES: 'create_poker_codes',
  EDIT_POKER_CODES: 'edit_poker_codes',

  // !Coupon Codes
  READ_COUPON_CODES: 'read_coupon_codes',
  READ_COUPON_GROUP: 'read_coupon_group',
  CREATE_COUPON_CODES: 'create_coupon_codes',
  EDIT_COUPON_CODES: 'edit_coupon_codes',
  EDIT_COUPON_GROUP: 'edit_coupon_group',
  // !Tips
  // READ
  READ_TIPS: 'read_tips',
  READ_OWN_VIP_TIPS: 'read_own_vip_tips',

  // !Users export
  // READ
  READ_EXPORT_USERS: 'read_export_users',

  // !Avatars
  // READ
  READ_AVATARS: 'read_avatars',
  // EDIT
  EDIT_AVATARS: 'edit_avatars',

  // !Rewards
  // READ
  READ_REWARDS: 'read_rewards',
  READ_OWN_VIP_REWARDS: 'read_own_vip_rewards',
  // CREATE
  CREATE_REWARDS: 'create_rewards',

  // !Games
  // READ
  READ_GAMES: 'read_games',
  EDIT_GAMES: 'edit_games',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];
