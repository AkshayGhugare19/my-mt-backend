import { Web3AuthJwtPayload } from '@modules/authentication/web3auth/dto/web3auth-payload.dto';
import { InvalidTokenError } from '@modules/authentication/web3auth/error/invalid-token.error';
import {
  ValidatorStrategy,
  ValidatorStrategyParams,
} from '@modules/authentication/web3auth/guards/strategy/validator.strategy';
import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class SocialsProviderValidatorStrategy implements ValidatorStrategy {
  /**
   *
   * @param params
   * @returns
   * @throws - {@link InvalidTokenError}
   */
  async validate(params: ValidatorStrategyParams): Promise<Web3AuthJwtPayload> {
    const { idToken, targetVerifier } = params;
    const jwks = createRemoteJWKSet(
      new URL('https://api-auth.web3auth.io/jwks'),
    );

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

    const payload = <Web3AuthJwtPayload>jwtDecoded.payload;
    const wallet = payload.wallets.find(
      (wallet) => wallet.type === 'web3auth_app_key',
    );
    if (!wallet) {
      throw new InvalidTokenError({
        idToken,
        targetVerifier,
      });
    }

    const isValid =
      wallet.public_key.toLowerCase() === targetVerifier.toLowerCase();

    if (!isValid) {
      throw new InvalidTokenError({
        idToken,
        targetVerifier,
      });
    }
    return payload;
  }
}
