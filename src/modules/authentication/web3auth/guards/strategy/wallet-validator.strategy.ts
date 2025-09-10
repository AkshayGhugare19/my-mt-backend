import { Web3AuthWalletJwtPayload } from '@modules/authentication/web3auth/dto/web3auth-payload.dto';
import { InvalidTokenError } from '@modules/authentication/web3auth/error/invalid-token.error';
import {
  ValidatorStrategy,
  ValidatorStrategyParams,
} from '@modules/authentication/web3auth/guards/strategy/validator.strategy';
import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class WalletValidatorStrategy implements ValidatorStrategy {
  /**
   *
   * @param params
   * @returns
   * @throws - {@link InvalidTokenError}
   */
  async validate(
    params: ValidatorStrategyParams,
  ): Promise<Web3AuthWalletJwtPayload> {
    const { idToken, targetVerifier } = params;
    const jwks = createRemoteJWKSet(new URL('https://authjs.web3auth.io/jwks'));

    // Verify the JWT using Web3Auth's JWKS
    const jwtDecoded = await jwtVerify(idToken, jwks, {
      algorithms: ['ES256'],
    }).catch((error) => {
      throw new InvalidTokenError({
        idToken,
        targetVerifier,
        message: error.message,
      });
    });

    const payload = <Web3AuthWalletJwtPayload>jwtDecoded.payload;

    const wallet = payload.wallets[0];

    if (!wallet) {
      throw new InvalidTokenError({
        idToken,
        targetVerifier,
      });
    }

    const isValid =
      wallet.address.toLowerCase() === targetVerifier.toLowerCase();

    if (!isValid) {
      throw new InvalidTokenError({
        idToken,
        targetVerifier,
      });
    }
    return payload;
  }
}
