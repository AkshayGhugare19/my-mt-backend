export const ONE_SECOND_IN_MS = 1000;
export const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
export const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
export const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;

export const ONE_MINUTE_IN_SECONDS = 60;
export const TEN_MINUTE_IN_SECONDS = ONE_MINUTE_IN_SECONDS * 10;
export const ONE_HOUR_IN_SECONDS = 60 * ONE_MINUTE_IN_SECONDS;
export const ONE_DAY_IN_SECONDS = 24 * ONE_HOUR_IN_SECONDS;

export const TRANSFORM_ZOD_DTO = 'transform-zod-dto';
export const SKIP_RESPONSE_FORMATTING = 'skip-response-formatting';
export const IS_ADMIN = 'is-admin';

export const TRON_EXPLORER_URLS = [
  'https://tronscan.io/#/transaction/',
  'https://tronscan.org/#/transaction/',
];

export const SOLANA_EXPLORER_URLS = [
  'https://solscan.io/tx/',
  'https://explorer.solana.com/tx/',
];

export const ETHEREUM_EXPLORER_URLS = [
  'https://etherscan.io/tx/',
  'https://etherscan.com/tx/',
];

// Redis Constants
export const WALLET_LOGIN_NONCE = 'walletLoginNonce';
export const USDT_PRICE = 'cache:usdtPrice';
export const USDC_PRICE = 'cache:usdcPrice';
export const SPORTS_BOOK_ID = 'games:sportBook';
export const FUNGAMESS_SESSION = 'fungamess-session';
export const ROLE_IDS = 'cache:roleIds';
export const USERS_BLACKLIST = 'usersBlacklist';

// DI Constants
export const TronWeb = 'TronWebProvider';
export const EgressProxy = 'EgressProxyProvider';

// Reflector Constants
export const ANY_OF_PERMISSION_REFLECTION_KEY = 'any_of_permissions';
export const ALL_OF_PERMISSION_REFLECTION_KEY = 'all_of_permissions';
