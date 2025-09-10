import { Web3AuthJwtPayload, Web3AuthWalletJwtPayload } from '@modules/authentication/web3auth/dto/web3auth-payload.dto';

/**
 * Validator strategy interface
 * @interface
 * @param {string} idToken - The id token
 * @param {string} validationTarget - The validation target: app_pub_key for socials, public_address for external-wallet
 */
export type ValidatorStrategyParams = {
  idToken: string;
  targetVerifier: string;
};

export interface ValidatorStrategy {
  validate(params: ValidatorStrategyParams): Promise<Web3AuthJwtPayload | Web3AuthWalletJwtPayload>;
}
