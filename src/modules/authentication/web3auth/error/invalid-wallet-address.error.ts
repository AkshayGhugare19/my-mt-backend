import { ErrorMessages } from '@common/enums/error-messages.enum';
import { SerializableException } from '@common/error/serializable-exception.error';
import {
  SupportedBlockchain,
  SupportedBlockchains,
} from '@modules/authentication/core/enum/supported-blockchains.enum';
import { HttpStatus } from '@nestjs/common';
export class InvalidWalletAddressError extends SerializableException {
  defaultResponseCode = HttpStatus.BAD_REQUEST;

  constructor(params?: {
    message?: string;
    errors?: { wallet?: string; blockchain?: SupportedBlockchain | number };
  }) {
    const { errors, message } = params ?? {};
    if (errors?.blockchain && typeof errors.blockchain === 'number') {
      errors.blockchain = Object.entries(SupportedBlockchains)
        .find((key, value) => value === errors.blockchain)?.[0]
        ?.toLowerCase() as SupportedBlockchain;
    }
    const errorMessage = errors
      ? `Invalid wallet address: ${errors.wallet}`
      : ErrorMessages.INVALID_WALLET_ADDRESS;
    super({ message: message || errorMessage, errors });
  }

  getMessage(): string {
    return ErrorMessages.INVALID_WALLET_ADDRESS;
  }

  getErrors(): Record<string, unknown> | undefined {
    return this.errors;
  }
}
