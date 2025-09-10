import { ENV } from '@common/env';
import {
  Web3AuthValidation,
  Web3AuthValidationSchema,
} from '@modules/authentication/web3auth/dto/web3auth-login.dto';
import {
  Web3AuthJwtPayload,
  Web3AuthWalletJwtPayload,
} from '@modules/authentication/web3auth/dto/web3auth-payload.dto';
import { Web3AuthPayloadTypes } from '@modules/authentication/web3auth/enum/payload-type.enum';
import { SocialsProviderValidatorStrategy } from '@modules/authentication/web3auth/guards/strategy/socials-provider-validator.strategy';
import { WalletValidatorStrategy } from '@modules/authentication/web3auth/guards/strategy/wallet-validator.strategy';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class Web3AuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly socialsProviderValidatorStrategy: SocialsProviderValidatorStrategy,
    private readonly walletValidatorStrategy: WalletValidatorStrategy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const body = request.body;

    if (!body) {
      throw new UnauthorizedException();
    }

    const parsedBody = Web3AuthValidationSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new UnauthorizedException();
    }

    const bodyData = parsedBody.data;
    const jwtPayload = await this.validate(bodyData);
    const aud: string[] =
      bodyData.type === 'external'
        ? this.configService.getOrThrow(ENV.WEB3AUTH_EXTERNAL_WALLET_AUD)
        : [this.configService.getOrThrow(ENV.WEB3AUTH_APP_KEY)];

    if (!aud.includes(jwtPayload.aud)) {
      throw new UnauthorizedException();
    }

    request.body = {
      authValidation: bodyData,
      jwtPayload,
    };

    return true;
  }

  private async validate(
    bodyData: Web3AuthValidation,
  ): Promise<Web3AuthJwtPayload | Web3AuthWalletJwtPayload> {
    try {
      if (bodyData.type === Web3AuthPayloadTypes.SOCIALS) {
        return await this.socialsProviderValidatorStrategy.validate({
          idToken: bodyData.idToken,
          targetVerifier: bodyData.targetVerifier,
        });
      }

      if (bodyData.type === Web3AuthPayloadTypes.EXTERNAL) {
        return await this.walletValidatorStrategy.validate({
          idToken: bodyData.idToken,
          targetVerifier: bodyData.targetVerifier,
        });
      }
    } catch (error) {
      if (this.configService.get(ENV.NODE_ENV) === 'development') {
        Logger.debug({
          stack: error.stack,
          message: error.message,
        });
      }
      throw new UnauthorizedException();
    }

    throw new UnauthorizedException();
  }
}
