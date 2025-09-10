import { TokenSettlementRequest } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type TokenSettlementRequestWithEmails = TokenSettlementRequest & {
  targetEmail: string;
  masterEmail: string;
  targetNickname: string;
  masterNickname: string;
};

export type MasterTokenSettlementRequestWithEmails = TokenSettlementRequestWithEmails & {
  flexibleBookieStake: Decimal,
  predefinedBookieStake: Decimal,
};

export type UploadTokenSettlementProof = {
  requestId: string;
  uploaderId: string;
  proof: string;
};

export type CloseTokenSettlement = {
  requestId: string;
  accepterId: string;
};
