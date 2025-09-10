export const CodeTypes = {
  ACCOUNT_VERIFICATION: 'ACCOUNT_VERIFICATION',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
  TWO_FACTOR_AUTHENTICATION: 'TWO_FACTOR_AUTHENTICATION',
} as const;

export type CodeType = (typeof CodeTypes)[keyof typeof CodeTypes];
