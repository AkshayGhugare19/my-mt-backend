import { Inject, Injectable } from '@nestjs/common';
import { TronWeb } from 'tronweb';
import { UmiProviderSymbol } from '../providers/symbols';
import { publicKey, Umi } from '@metaplex-foundation/umi';
import { stringToUint8Array } from '@utils/string-to-uint-array';
import Web3 from 'web3';

@Injectable()
export class WalletService {
  constructor(
    private readonly tronWeb: TronWeb,
    @Inject(UmiProviderSymbol) public readonly umi: Umi,
  ) {}

  async validateTronSignature(
    wallet: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    const address = await this.tronWeb.trx
      .verifyMessageV2(message, signature)
      .catch((e) => {
        console.log(e);
        return false;
      });

    return wallet === address;
  }

  async validateSolanaSignature(
    wallet: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    return this.umi.eddsa.verify(
      stringToUint8Array(message),
      stringToUint8Array(signature),
      publicKey(wallet),
    );
  }

  async validateSolanaHexSignature(
    wallet: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    const signatureBuffer = Buffer.from(signature, 'hex');
    return this.umi.eddsa.verify(
      stringToUint8Array(message),
      signatureBuffer,
      publicKey(wallet),
    );
  }

  async validateEthereumSignature(
    wallet: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    const web3 = new Web3();

    const recoveredAddress = web3.eth.accounts.recover(message, signature);

    return recoveredAddress.toLowerCase() === wallet.toLowerCase();
  }
}
