import { extendApi } from '@anatine/zod-openapi';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { createZodDto } from '@common/helper/create-zod-dto';
import { zDiscriminatedUnion } from '@common/validation/z-discriminated-union';
import { SupportedBlockchainsSchema } from '@modules/authentication/core/enum/supported-blockchains.enum';
import {
  Web3AuthJwtPayload,
  Web3AuthJwtPayloadSchema,
  Web3AuthWalletJwtPayloadSchema,
} from '@modules/authentication/web3auth/dto/web3auth-payload.dto';
import {
  Web3AuthPayloadTypes,
  Web3AuthPayloadTypeSchema,
} from '@modules/authentication/web3auth/enum/payload-type.enum';
import { z } from 'zod';

export const Web3AuthValidationSchema = extendApi(
  z.object({
    idToken: z.string().describe('User idToken from web3 session'),
    targetVerifier: z
      .string()
      .describe(
        'The target verifier: app_pub_key for socials login, public_address for external-wallet login',
      ),
    type: Web3AuthPayloadTypeSchema.describe(
      'The type of login: socials or external',
    ),
    blockchain: SupportedBlockchainsSchema,
    partnerMatrixBtag: z
      .string()
      .optional()
      .describe('Partner Matrix affiliate btag'),
    countryCode: z.string().min(2, ValidationErrorMessages.INPUT_TOO_SHORT).max(2, ValidationErrorMessages.INPUT_TOO_LONG).optional(),
    allWalletsWithSignatures: z
      .array(
        z.object({
          address: z.string(),
          signature: z.string(),
          chain: SupportedBlockchainsSchema,
        }),
      )
      .optional()
      .describe(
        'All wallet addresses with signatures, used for social login to check if the user has already signed in with this wallet',
      ),
  }),
);

export type Web3AuthValidation = z.infer<typeof Web3AuthValidationSchema>;

export const Web3AuthLoginSchema = z.object({
  authValidation: Web3AuthValidationSchema,
  jwtPayload: z
    .any()
    .transform((data) => {
      if (!data) return z.NEVER;
      if ((<Web3AuthJwtPayload>data).nonce) {
        data.type = Web3AuthPayloadTypes.SOCIALS;
      } else {
        data.type = Web3AuthPayloadTypes.EXTERNAL;
      }
      return data;
    })
    .pipe(
      zDiscriminatedUnion('type', [
        Web3AuthJwtPayloadSchema,
        Web3AuthWalletJwtPayloadSchema,
      ]),
    ),
});

export type Web3AuthLogin = z.infer<typeof Web3AuthLoginSchema>;

@ZodDto()
export class Web3AuthLoginBody extends createZodDto(Web3AuthValidationSchema) {
  constructor(data: Web3AuthLoginBody) {
    super();
    if (data) Object.assign(this, data);
  }
}

@ZodDto()
export class Web3AuthLoginDto extends createZodDto(Web3AuthLoginSchema) {
  constructor(data: Web3AuthLoginDto) {
    super();
    if (data) Object.assign(this, data);
  }
}
