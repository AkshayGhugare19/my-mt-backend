import { Web3AuthPayloadTypes } from '@modules/authentication/web3auth/enum/payload-type.enum';

export type Web3AuthSocialsAccount = {
  type: typeof Web3AuthPayloadTypes.SOCIALS;
  publicKey: string;
  curve: string;
  nonce: string;
  email?: string;
  exp: number;
  provider: string;
};
export type Web3AuthWalletAccount = {
  type: typeof Web3AuthPayloadTypes.EXTERNAL;
  address: string;
  blockchain: string;
  exp: number;
  provider: string;
};

export type CreateWeb3AuthAccount =
  | Web3AuthSocialsAccount
  | Web3AuthWalletAccount;

export type CreateWeb3AuthUser = {
  wallet: string;
  blockchain: number;
  web3AuthAccount: CreateWeb3AuthAccount;
  partnerMatrixBtag?: string;
  countryCode?: string;
};
