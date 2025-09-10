import { EnumValues } from '@common/enums/common';

export const TokenRequestStatuses = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
  PROOF_ADDED: 'PROOF_ADDED',
} as const;

export type TokenRequestStatus = EnumValues<typeof TokenRequestStatuses>;
