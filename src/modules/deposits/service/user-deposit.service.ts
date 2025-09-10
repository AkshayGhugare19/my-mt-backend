import { ErrorMessages } from '@common/enums/error-messages.enum';
import { Blockchain } from '@infrastructure/database/prisma/constants';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { WalletService } from '@modules/wallet/service/wallet.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { DepositWallet } from '@prisma/client';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { DEPOSIT_VALIDATION_NONCE_PREFIX } from '@modules/deposits/constants';
import { Redis } from 'ioredis';
import { ONE_MINUTE_IN_MS } from '@common/constants';
import { randomBytes } from 'crypto';
import { UserService } from '@modules/user/services/user.service';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { ETHEREUM_DEPOSIT_PUBLIC_KEY_SECRET, SOLANA_DEPOSIT_PUBLIC_KEY_SECRET, TRON_DEPOSIT_PUBLIC_KEY_SECRET } from '@infrastructure/secrets/config';

@Injectable()
export class UserDepositService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly walletService: WalletService,
    private readonly userService: UserService,
    private readonly secretsService: SecretsService,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async getLastDepositBlockTimestamp(blockchain: number): Promise<string | null> {
    switch (blockchain) {
      case Blockchain.Tron:
        return this.redis.get(
          await this.secretsService.getSecretOrFail(
            TRON_DEPOSIT_PUBLIC_KEY_SECRET,
          ),
        );
      case Blockchain.Solana:
        return this.redis.get(
          await this.secretsService.getSecretOrFail(
            SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
          ),
        );
      case Blockchain.Ethereum:
        return this.redis.get(
          await this.secretsService.getSecretOrFail(
            ETHEREUM_DEPOSIT_PUBLIC_KEY_SECRET,
          ),
        );
      default:
        return null;
    }
  }

  async getUserDepositWallet(userId: string): Promise<DepositWallet | null> {
    return this.prismaService.depositWallet.findFirst({
      where: { userId, isActive: true },
    });
  }

  async getByWallet(wallet: string): Promise<DepositWallet | null> {
    return this.prismaService.depositWallet.findFirst({
      where: { wallet, isActive: true },
    });
  }

  async createUserDepositWallet(
    userId: string,
    wallet: string,
    blockchain: keyof typeof Blockchain,
    active: boolean,
  ): Promise<DepositWallet> {
    return this.prismaService.depositWallet.create({
      data: {
        userId,
        wallet,
        blockchain: Blockchain[blockchain],
        isActive: active,
      },
    });
  }

  async generateNonce(userId: string, walletAddress: string): Promise<string> {
    const nonce = randomBytes(12).toString('base64');
    await this.redis.set(
      `${DEPOSIT_VALIDATION_NONCE_PREFIX}:${userId}:${walletAddress}`,
      nonce,
      'PX',
      ONE_MINUTE_IN_MS,
    );
    return nonce;
  }

  async selectBlockchain(
    userId: string,
    selectedBlockchain: {
      blockchain: number;
      targetSignature: string;
      verifierSignature: string;
      walletAddress: string;
      verifierAddress: string;
    },
  ): Promise<DepositWallet> {
    const {
      blockchain,
      targetSignature,
      verifierSignature,
      walletAddress,
      verifierAddress,
    } = selectedBlockchain;

    // Validate nonce first
    const nonce = await this.redis.get(
      `${DEPOSIT_VALIDATION_NONCE_PREFIX}:${userId}:${walletAddress}`,
    );
    if (!nonce) {
      throw new BadRequestException(ErrorMessages.INVALID_LOGIN_SIGNATURE);
    }

    // Normalize addresses based on blockchain type
    const normalizedWalletAddress = this.normalizeAddress(
      walletAddress,
      blockchain,
    );
    const normalizedVerifierAddress = this.normalizeAddress(
      verifierAddress,
      Blockchain.Ethereum,
    );

    // Validate signatures before database operations
    const loginMessage = Buffer.from(`${walletAddress}:${nonce}`).toString(
      'base64',
    );

    const isValidVerifierSignature =
      await this.walletService.validateEthereumSignature(
        normalizedVerifierAddress,
        loginMessage,
        verifierSignature,
      );
    if (!isValidVerifierSignature) {
      throw new BadRequestException(ErrorMessages.INVALID_LOGIN_SIGNATURE);
    }

    // Validate target signature based on blockchain type
    const isValid = await this.validateBlockchainSignature(
      normalizedWalletAddress,
      loginMessage,
      targetSignature,
      blockchain,
    );
    if (!isValid) {
      throw new BadRequestException(ErrorMessages.INVALID_LOGIN_SIGNATURE);
    }

    await this.redis.del(
      `${DEPOSIT_VALIDATION_NONCE_PREFIX}:${userId}:${walletAddress}`,
    );

    // Perform all database operations in a transaction
    return this.prismaService.$transaction(async (transactionManager) => {
      const existingWallet = await transactionManager.depositWallet.findFirst({
        where: { userId, wallet: normalizedWalletAddress, blockchain },
        include: { user: { select: { wallet: true } } },
      });

      if (
        existingWallet &&
        existingWallet.blockchain === blockchain &&
        existingWallet.wallet === normalizedWalletAddress
      ) {
        if (!existingWallet.isActive) {
          await transactionManager.depositWallet.updateMany({
            where: { userId },
            data: {
              isActive: false,
            },
          });
          await transactionManager.depositWallet.update({
            where: { userId, wallet: normalizedWalletAddress, blockchain },
            data: { isActive: true },
          });
          return existingWallet;
        }
        return existingWallet;
      }

      const duplicateWallet = await transactionManager.depositWallet.findUnique(
        {
          where: { wallet: normalizedWalletAddress, userId: { not: userId } },
        },
      );

      if (duplicateWallet) {
        throw new BadRequestException(ErrorMessages.WALLET_ALREADY_IN_USE);
      }

      if (existingWallet?.user && !existingWallet.user.wallet) {
        await this.userService.updateById(
          userId,
          {
            blockchain,
            wallet: normalizedWalletAddress,
          },
          transactionManager,
        );
      }

      await transactionManager.depositWallet.updateMany({
        where: { userId },
        data: {
          isActive: false,
        },
      });
      return transactionManager.depositWallet.create({
        data: {
          userId,
          wallet: normalizedWalletAddress,
          blockchain,
          isActive: true,
        },
      });
    });
  }

  private normalizeAddress(address: string, blockchain: number): string {
    if (blockchain === Blockchain.Ethereum) {
      return address.toLowerCase();
    }
    return address;
  }

  private async validateBlockchainSignature(
    address: string,
    message: string,
    signature: string,
    blockchain: number,
  ): Promise<boolean> {
    switch (blockchain) {
      case Blockchain.Ethereum:
        return this.walletService.validateEthereumSignature(
          address,
          message,
          signature,
        );
      case Blockchain.Tron:
        return this.walletService.validateTronSignature(
          address,
          message,
          signature,
        );
      case Blockchain.Solana: {
        return this.walletService.validateSolanaHexSignature(
          address,
          message,
          signature,
        );
      }
      default:
        return false;
    }
  }
}
