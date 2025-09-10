import { z } from 'zod';

export const envValidationSchema = z.object({
  NODE_ENV: z.string().default('development'),
  APP_PORT: z.number({ coerce: true }),
  API_BASE_URL: z.string(),
  WEB_APP_BASE_URL: z.string(),
  ADMIN_APP_BASE_URL: z.string(),
  SYNC_TOKEN: z.string(),
  SECRETS_TOKEN: z.string().length(32),

  POSTGRES_PORT: z.number({ coerce: true }),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_HOST: z.string(),
  DATABASE_CONNECTION_LIMIT: z.number({ coerce: true }),
  DATABASE_URL: z.string(),

  REDIS_PORT: z.number({ coerce: true }),
  REDIS_HOST: z.string(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_USERNAME: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_DB: z.number({ coerce: true }),
  CACHE_REDIS_DB: z.number({ coerce: true }).optional(),

  RABBITMQ_PORT: z.number({ coerce: true }),
  RABBITMQ_HOST: z.string(),
  RABBITMQ_USERNAME: z.string(),
  RABBITMQ_PASSWORD: z.string(),
  RABBITMQ_URL: z.string(),

  CLIENT_BASIC_AUTH: z.string().optional(),

  FORGOT_PASSWORD_CODE_DURATION: z.string().default('300000'), // 5 minutes as ms
  ACCOUNT_VERIFICATION_CODE_DURATION: z.string().default('3000000'), // 50 minutes as ms
  TWO_FACTOR_AUTHENTICATION_CODE_DURATION: z.string().default('300000'), // 5 minutes as ms

  ENABLE_SWAGGER: z.boolean({ coerce: true }).default(false),

  JWT_ISSUER: z.string(),

  JWT_PRIVATE_KEY: z.string(),
  JWT_PUBLIC_KEY: z.string(),
  JWT_KEY_ID: z.string(),

  REFRESH_TOKEN_DURATION: z.string(),

  JWT_SECRET: z.string(),
  JWT_DURATION: z.string(),

  JWT_ADMIN_SECRET: z.string(),
  JWT_ADMIN_DURATION: z.string(),
  ADMIN_REFRESH_TOKEN_DURATION: z.string(),

  CORS_ORIGINS: z.string(),

  WEB3AUTH_APP_KEY: z.string(),
  WEB3AUTH_EXTERNAL_WALLET_AUD: z.string().transform((value) => {
    return value.split(',').map((ip) => {
      return ip.trim();
    });
  }),

  SENDGRID_API_KEY: z.string(),
  MAILING_DOMAIN: z.string(),
  MAILING_HASH_KEY: z.string(),

  PUSHER_HOST: z.string(),
  PUSHER_PORT: z.string(),
  PUSHER_TLS: z.boolean({ coerce: true }).default(false),
  PUSHER_APP_ID: z.string(),
  PUSHER_APP_KEY: z.string(),
  PUSHER_APP_SECRET: z.string(),

  HASH_AUTHORIZATION_KEY: z.string(),
  SPORTS_EXCHANGE_BASE_URL: z.string(),
  SPORTS_EXCHANGE_CLIENT_KEY: z.string(),
  SPORTS_EXCHANGE_CLIENT_NAME: z.string(),
  SPORTS_EXCHANGE_BACK_URL: z.string(),
  SPORTS_EXCHANGE_IP: z.string().refine((value) => {
    return value.split(',').every((ip) => {
      return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
    });
  }),
  SPORTS_EXCHANGE_API_KEY: z.string(),
  SPORTS_EXCHANGE_FOOTBALL_TAB: z.string(),
  SPORTS_EXCHANGE_CRICKET_TAB: z.string(),
  SPORTS_EXCHANGE_TENNIS_TAB: z.string(),
  EGRESS_PROXY_URL: z.string().optional(),

  // Sports Book
  FUNGAMESS_JWT_SECRET: z.string(),
  FUNGAMESS_JWT_DURATION: z.string(),
  FUNGAMESS_BASE_API_URL: z.string(),
  FUNGAMESS_WHITELIST_IPS: z.string().transform((value) => {
    return value.split(',').map((ip) => {
      return ip.trim();
    });
  }),
  FUNGAMESS_ENABLE_IP_CHECK: z
    .boolean({ coerce: true })
    .optional()
    .default(false),
  FUNGAMESS_EXIT_URL: z.string(),
  GAME_IMAGE_ROOT: z.string(),
  FUNGAMESS_BYPASS_SIGNATURE: z
    .boolean({ coerce: true })
    .optional()
    .default(false),

  // Coinmarketcap
  COINMARKETCAP_API_KEY: z.string(),

  // EvenBet
  EVENBET_BASE_API_URL: z.string(),
  EVENBET_CLIENT_ID: z.string(),
  EVENBET_SECRET_KEY: z.string(),
  EVENBET_SIGNING_SECRET: z.string(),

  // Slotegrator
  SLOTEGRATOR_BASE_API_URL: z.string(),
  SLOTEGRATOR_MERCHANT_ID: z.string(),
  SLOTEGRATOR_MERCHANT_KEY: z.string(),
  SLOTEGRATOR_CURRENCY: z.string().default('USD'),

  SLOTEGRATOR_SPORTSBOOK_MERCHANT_ID: z.string(),
  SLOTEGRATOR_SPORTSBOOK_MERCHANT_KEY: z.string(),
  SLOTEGRATOR_SPORTSBOOK_BASE_API_URL: z.string(),
  SLOTEGRATOR_SPORTSBOOK_CURRENCY: z.string().default('USD'),

  // Solanafm
  SOLANAFM_API_KEY: z.string(),
  DISABLE_BONUS_SYSTEM: z.boolean({ coerce: true }).default(false),

  // Solscan
  SOLSCAN_API_KEY: z.string(),

  // Alchemy
  ALCHEMY_API_KEY: z.string(),
  ALCHEMY_BASE_API_URL: z.string(),

  // PartnerMatrix
  PM_SKIN_ID: z.string(),
  PM_AUTH_KEY: z.string(),
  PM_URL: z.string(),

  // Gamanza Engage
  GAMANZA_ENGAGE_CLIENT_ID: z.string(),
  GAMANZA_ENGAGE_SECRET_KEY: z.string(),
  GAMANZA_ENGAGE_BASE_API_URL: z.string(),
  GAMANZA_ENGAGE_SIGNATURE_KEY: z.string(),

  // MoonPay
  MOONPAY_SECRET_KEY: z.string(),

  // Google
  GOOGLE_RECAPTCHA_SECRET_KEY: z.string(),

  // Disabling
  DISABLE_TRANSFERS_PRODUCER_TRON: z.string().optional(),
  DISABLE_TRANSFERS_PRODUCER_SOLANA: z.string().optional(),
  DISABLE_TRANSFERS_PRODUCER_ETHEREUM: z.string().optional(),
  DISABLE_CRON_CHECK_WITHDRAWAL_WALLETS_BALANCES: z.string().optional(),
  DISABLE_CRON_GAMANZA_REWARDS: z.string().optional(),

  // Tron
  TRON_HOST_URL: z.string(),
  TRON_API_KEY: z.string(),
  TRON_USDT_CONTRACT_ADDRESS: z.string(),
  TRON_USDC_CONTRACT_ADDRESS: z.string(),
  USD_POINTS: z.number({ coerce: true }),

  // Solana
  SOLANA_RPC_URL: z.string(),
  SOLANA_USDT_CONTRACT_ADDRESS: z.string(),
  SOLANA_USDC_CONTRACT_ADDRESS: z.string(),
  SOLANA_MAX_PRIORITY_FEE_USD: z.number({ coerce: true }),

  // Ethereum
  ETHEREUM_RPC_URL: z.string(),
  ETHEREUM_USDT_CONTRACT_ADDRESS: z.string(),
  ETHEREUM_USDC_CONTRACT_ADDRESS: z.string(),

  // Tatum
  TATUM_API_KEY: z.string(),

  // Bonuses
  WELCOME_BONUS_PERCENTAGE: z.number({ coerce: true }).default(100),

  // bucket
  SPACES_ENDPOINT: z.string(),
  SPACES_REGION: z.string(),
  SPACES_ACCESS_KEY: z.string(),
  SPACES_KEY_ID: z.string(),
  SPACES_CDN_ENDPOINT: z.string(),
  SPACE_BUCKET_NAME: z.string(),
  SPACES_FORCE_PATH_STYLE: z.boolean({ coerce: true }).default(false),
  SPACES_DEFAULT_AVATARS_PATH: z.string(),

  SLACK_WEBHOOK_URL: z.string(),

  // Push Notifications
  PUSH_NOTIFICATION_TAG: z.string(),
  PUSH_NOTIFICATION_VAPID_PUBLIC_KEY: z.string(),
  PUSH_NOTIFICATION_VAPID_PRIVATE_KEY: z.string(),
});

const schemaShape = envValidationSchema.shape;

const keys = Object.keys(schemaShape) as Array<keyof typeof schemaShape>;
// convert envValidationSchema to an object whose keys are the same as the keys in the schema and values are also the keys in the schema
export const ENV = keys.reduce(
  (acc, key) => {
    acc[key] = key;
    return acc;
  },
  // eslint-disable-next-line no-unused-vars
  {} as { [k in keyof typeof schemaShape]: string },
);
