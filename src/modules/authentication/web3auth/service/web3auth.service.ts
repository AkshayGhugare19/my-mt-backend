import { WALLET_LOGIN_NONCE } from '@common/constants';
import {
  convertEthPublicKeyToAddress,
  convertSolanaED25519PublicKeyToAddress,
  convertSolanaSECP2561k1PublicKeyToAddress,
  convertTronPublicKeyToAddress,
} from '@common/helper/convert-public-key-to-address';
import { Blockchain } from '@infrastructure/database/prisma/constants';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { UserLoginEvent, UserRegisterEvent } from '@infrastructure/event/classes';
import { EventNamespace } from '@infrastructure/event/namespace';
import { isPublicKey } from '@metaplex-foundation/umi';
import {
  SupportedBlockchain,
  SupportedBlockchains,
} from '@modules/authentication/core/enum/supported-blockchains.enum';
import { AuthTokenService } from '@modules/authentication/core/service/auth-token.service';
import { LoginResponse } from '@modules/authentication/types';
import { WEB3AUTH_JWT_SERVICE } from '@modules/authentication/web3auth/constants';
import {
  Web3AuthLogin,
  Web3AuthLoginDto,
} from '@modules/authentication/web3auth/dto/web3auth-login.dto';
import { InvalidChainError } from '@modules/authentication/web3auth/error/invalid-chain.error';
import { InvalidWalletAddressError } from '@modules/authentication/web3auth/error/invalid-wallet-address.error';
import {
  CreateWeb3AuthAccount,
  CreateWeb3AuthUser,
  Web3AuthSocialsAccount,
  Web3AuthWalletAccount,
} from '@modules/authentication/web3auth/types';
import { Role, Roles } from '@modules/role/enum/role.enum';
import { UserService } from '@modules/user/services/user.service';
import { UserInfo, UserWithBalance } from '@modules/user/types';
import { WalletService } from '@modules/wallet/service/wallet.service';
import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Web3AuthAccount } from '@prisma/client';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { ethers } from 'ethers';
import { Redis } from 'ioredis';
import { TronWeb } from 'tronweb';

@Injectable()
export class Web3AuthService {
  private readonly logger = new Logger(Web3AuthService.name);

  constructor(
    private readonly userService: UserService,
    @Inject(WEB3AUTH_JWT_SERVICE)
    protected readonly web3AuthJwtService: JwtService,
    protected readonly configService: ConfigService,
    private readonly authTokenService: AuthTokenService,
    private readonly prismaService: PrismaService,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly walletService: WalletService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async generateLoginToken(userId: string): Promise<string> {
    const existingToken = await this.redis.get(`web3AuthLoginToken:${userId}`);
    if (existingToken) {
      return existingToken;
    }

    const user = await this.userService.getUserInfoOrThrow(userId);
    const firstRole = user.roles.at(0);

    if (!user.active) {
      throw new NotFoundException();
    }

    if (!firstRole) {
      this.logger.error(`User does not have any roles: ${user.id}`);
      throw new InternalServerErrorException();
    }

    if (firstRole.name !== Roles.USER) {
      throw new ForbiddenException();
    }
    const token = await this.web3AuthJwtService.signAsync({
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
    });
    await this.redis.set(`web3AuthLoginToken:${userId}`, token, 'EX', 60);
    return token;
  }

  async walletLogin(loginData: Web3AuthLoginDto): Promise<LoginResponse> {
    await this.verifyDuplicateTokenUsage(
      loginData.authValidation.idToken,
      loginData.jwtPayload,
    );
    const wallet = this.getWalletAddress(loginData);

    const existingUser = await this.userService.findByWallet(wallet);

    try {
      // There is no user with that wallet in our db
      if (!existingUser) {
        const existingByOtherWallets = await this.userService.findByWallets(
          loginData.authValidation.allWalletsWithSignatures!.map((wallet) => ({
            address: wallet.address,
            blockchain: this.mapBlockchainFromAuthValidation(
              { blockchain: wallet.chain },
              wallet.address,
            ),
          })),
        );

        if (existingByOtherWallets) {
          const foundWallet =
            loginData.authValidation.allWalletsWithSignatures!.find(
              (wallet) => wallet.address === existingByOtherWallets.wallet,
            )!;
          const SignatureValid = await this.verifyWalletSignature(
            foundWallet.address,
            foundWallet.chain,
            foundWallet.signature,
          );

          if (!SignatureValid) {
            throw new UnauthorizedException();
          }

          await this.userService.updateById(existingByOtherWallets.id, {
            wallet,
            blockchain: Blockchain.Ethereum,
          });
          await this.linkWeb3AuthWallet(existingByOtherWallets.id, loginData);

          return await this.login(existingByOtherWallets.id, wallet, loginData);
        }

        return await this.registerWallet(wallet, loginData);
      }

      await this.linkWeb3AuthWallet(existingUser.id, loginData);
      if (!existingUser.countryCode && loginData.authValidation.countryCode) {
        const updatedUser = await this.userService.updateById(existingUser.id, {
          countryCode: loginData.authValidation.countryCode,
        });
        this.eventEmitter.emit(
          EventNamespace.USER_REGISTER,
          new UserRegisterEvent({
            playerTag: updatedUser.playerTag,
            nickname: updatedUser.nickname || undefined,
            pmBtag: updatedUser.partnerMatrixBtag || undefined,
            pmId: updatedUser.partnerMatrixId || undefined,
            countryCode: updatedUser.countryCode || undefined,
            regDate: updatedUser.createdAt || undefined,
          }),
        );
      }
      return this.login(existingUser.id, wallet, loginData);
    } catch (error) {
      this.logger.error(error);
      throw error;
    } finally {
      await this.addJwtTokenToBlacklist(
        loginData.authValidation.idToken,
        loginData.jwtPayload,
      );
    }
  }

  private async linkWeb3AuthWallet(
    userId: string,
    loginData: Web3AuthLoginDto,
  ): Promise<void> {
    const web3AuthAccount = await this.prismaService.web3AuthAccount.findFirst({
      where: {
        userId,
      },
    });

    if (web3AuthAccount && !web3AuthAccount.provider) {
      const web3AuthAccountData = this.formatWeb3AuthAccountData({
        loginPayload: loginData.jwtPayload,
      });
      await this.prismaService.web3AuthAccount.update({
        where: {
          id: web3AuthAccount.id,
        },
        data: {
          provider: web3AuthAccountData.provider,
        },
      });
    }
  }

  private async verifyWalletSignature(
    wallet: string,
    chain: SupportedBlockchain,
    signature: string,
  ): Promise<boolean> {
    const nonce = await this.redis.get(`${WALLET_LOGIN_NONCE}:${wallet}`);

    if (!nonce) {
      throw new UnauthorizedException();
    }

    const loginMessage = Buffer.from(`${wallet}:${nonce}`).toString('base64');
    switch (chain) {
      case SupportedBlockchains.ETHEREUM:
        return this.walletService.validateEthereumSignature(
          wallet,
          loginMessage,
          signature,
        );
      case SupportedBlockchains.SOLANA:
        return this.walletService.validateSolanaHexSignature(
          wallet,
          loginMessage,
          signature,
        );
      case SupportedBlockchains.TRON:
        return this.walletService.validateTronSignature(
          wallet,
          loginMessage,
          signature,
        );
    }
    return false;
  }

  private async verifyDuplicateTokenUsage(
    idToken: string,
    jwtPayload: Web3AuthLogin['jwtPayload'],
  ): Promise<void> {
    const blacklistItem =
      jwtPayload.type === 'socials' ? jwtPayload.nonce : idToken;
    const isBlacklisted = await this.redis.exists(blacklistItem);
    if (isBlacklisted) {
      throw new UnauthorizedException();
    }
  }

  private async addJwtTokenToBlacklist(
    idToken: string,
    jwtPayload: Web3AuthLogin['jwtPayload'],
  ): Promise<void> {
    const blacklistItem =
      jwtPayload.type === 'socials' ? jwtPayload.nonce : idToken;
    await this.redis.set(blacklistItem, idToken, 'EX', jwtPayload.exp, 'NX');
  }

  /**
   *
   * @param wallet
   * @param userId
   * @returns - {@link LoginResponse}
   * @throws - {@link BadRequestException} if the wallet is already in use
   */
  private async registerWallet(
    wallet: string,
    loginData: Web3AuthLoginDto,
  ): Promise<LoginResponse> {
    const { authValidation, jwtPayload } = loginData;
    const blockchain = this.mapBlockchainFromAuthValidation(
      authValidation,
      wallet,
    );

    // If the user is not logged in and the wallet is not in use, register the user
    const registerResult = await this.registerWalletUser({
      blockchain,
      wallet,
      web3AuthAccount: this.formatWeb3AuthAccountData({
        loginPayload: jwtPayload,
      }),
      partnerMatrixBtag: loginData.authValidation.partnerMatrixBtag,
    });

    this.eventEmitter.emit(
      EventNamespace.USER_REGISTER,
      new UserRegisterEvent({
        playerTag: registerResult.user.playerTag,
        nickname: registerResult.user.nickname || undefined,
        pmBtag: loginData.authValidation.partnerMatrixBtag,
        pmId: registerResult.user.partnerMatrixId || undefined,
        countryCode: registerResult.user.countryCode || undefined,
      }),
    );

    return registerResult;
  }

  private async login(
    userId: string,
    loginWallet: string,
    loginData: Web3AuthLoginDto,
  ): Promise<LoginResponse> {
    const userInfo = await this.userService.getUserInfoOrThrow(userId);
    const firstRole = userInfo.roles.at(0);

    if (!firstRole) {
      this.logger.error(`User does not have any roles: ${userInfo.id}`);
      throw new InternalServerErrorException();
    }

    this.validateUserBlockchain(loginData, loginWallet, userInfo);

    this.eventEmitter.emit(
      EventNamespace.USER_LOGIN,
      new UserLoginEvent({
        playerId: userInfo.id,
        date: new Date().toISOString(),
      }),
    );

    const { accessToken, refreshToken } =
      await this.authTokenService.generateClientTokens(
        userInfo,
        firstRole.name as Role,
      );

    return {
      token: accessToken,
      refreshToken,
      user: userInfo,
    };
  }

  /**
   *
   * @param loginData
   * @param loginWallet
   * @param userInfo
   *
   * @throws - {@link InvalidChainError} if the user blockchain does not match the login blockchain
   */
  private validateUserBlockchain(
    loginData: Web3AuthLoginDto,
    loginWallet: string,
    userInfo: UserWithBalance,
  ): void {
    const blockchain = this.mapBlockchainFromAuthValidation(
      loginData.authValidation,
      loginWallet,
    );

    if (userInfo.blockchain !== blockchain) {
      throw new InvalidChainError({
        errors: {
          blockchain,
          userBlockchain: userInfo.blockchain ?? undefined,
        },
      });
    }
  }

  /**
   *
   * @param params
   * @returns
   *
   * @throws - {@link InvalidWalletAddressError} if the wallet address is invalid
   */
  private formatWeb3AuthAccountData(params: {
    loginPayload: Web3AuthLogin['jwtPayload'];
  }): CreateWeb3AuthAccount {
    const { loginPayload } = params;
    if (loginPayload.type === 'external') {
      return {
        type: 'external',
        address: loginPayload.wallets[0].address,
        blockchain: loginPayload.wallets[0].type,
        exp: loginPayload.exp,
        provider: loginPayload.iss,
      } as Web3AuthWalletAccount;
    }

    if (loginPayload.type === 'socials') {
      return {
        nonce: loginPayload.nonce,
        publicKey: loginPayload.wallets[0].public_key,
        type: 'socials',
        curve: loginPayload.wallets[0].curve,
        email: loginPayload.email,
        exp: loginPayload.exp,
        provider: loginPayload.aggregateVerifier ?? loginPayload.verifier,
      } as Web3AuthSocialsAccount;
    }

    throw new InvalidWalletAddressError();
  }

  private getWalletAddress(loginPayload: Web3AuthLogin): string {
    const { authValidation, jwtPayload } = loginPayload;
    if (jwtPayload.type === 'external') {
      const address = jwtPayload.wallets[0]?.address;
      if (!address) {
        throw new InvalidWalletAddressError({ errors: { wallet: address } });
      }
      return address;
    }

    try {
      if (jwtPayload.type === 'socials') {
        const wallet = jwtPayload.wallets.find(
          (wallet) => wallet.type === 'web3auth_app_key',
        );
        if (!wallet) {
          throw new InvalidWalletAddressError({ errors: { wallet } });
        }

        if (wallet.curve === 'ed25519') {
          return convertSolanaED25519PublicKeyToAddress(wallet.public_key);
        }
        switch (authValidation.blockchain) {
          case SupportedBlockchains.ARBITRUM:
          case SupportedBlockchains.ETHEREUM:
          case SupportedBlockchains.BNB:
            return convertEthPublicKeyToAddress(wallet.public_key);
          case SupportedBlockchains.TRON:
            return convertTronPublicKeyToAddress(wallet.public_key);
          case SupportedBlockchains.SOLANA:
            return convertSolanaSECP2561k1PublicKeyToAddress(wallet.public_key);
        }
      }
    } catch (error) {
      this.logger.error(
        { message: error.message, stack: error.stack },
        'getWalletAddress',
      );
      throw new InvalidWalletAddressError({
        errors: { wallet: jwtPayload.wallets[0]?.public_key },
      });
    }

    throw new InvalidWalletAddressError();
  }

  private async createWeb3AuthAccount(
    userId: string,
    web3AuthUser: CreateWeb3AuthAccount,
    transactionManager?: PrismaTransactionManager,
  ): Promise<Web3AuthAccount> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (transactionManager) => {
        return await this.createWeb3AuthAccount(
          userId,
          web3AuthUser,
          transactionManager,
        );
      });
    }
    const client = this.getClient(transactionManager);
    return client.web3AuthAccount.create({
      data: {
        userId,
        type: web3AuthUser.type,
        blockchain: (<Web3AuthWalletAccount>web3AuthUser)?.blockchain,
        curve: (<Web3AuthSocialsAccount>web3AuthUser)?.curve,
        email: (<Web3AuthSocialsAccount>web3AuthUser)?.email,
        provider: (<Web3AuthSocialsAccount>web3AuthUser)?.provider,
      },
    });
  }

  private mapBlockchainFromAuthValidation(
    authValidation: { blockchain: SupportedBlockchain },
    wallet: string,
  ): number {
    try {
      switch (authValidation.blockchain) {
        case SupportedBlockchains.TRON: {
          TronWeb.isAddress(wallet);
          return Blockchain.Tron;
        }
        case SupportedBlockchains.SOLANA: {
          isPublicKey(wallet);
          return Blockchain.Solana;
        }
        case SupportedBlockchains.BNB: {
          ethers.isAddress(wallet);
          return Blockchain.Bnb;
        }
        case SupportedBlockchains.ARBITRUM: {
          ethers.isAddress(wallet);
          return Blockchain.Arbitrum;
        }
        case SupportedBlockchains.ETHEREUM: {
          ethers.isAddress(wallet);
          return Blockchain.Ethereum;
        }
        default: {
          throw new InvalidWalletAddressError({
            errors: { wallet, blockchain: undefined },
          });
        }
      }
    } catch (error) {
      throw new InvalidWalletAddressError({
        errors: { wallet, blockchain: authValidation.blockchain },
      });
    }
  }

  private async registerWalletUser(
    registerUser: CreateWeb3AuthUser,
    transactionManager?: PrismaTransactionManager,
  ): Promise<LoginResponse> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (transactionManager) => {
        return await this.registerWalletUser(registerUser, transactionManager);
      });
    }

    const savedUser = await this.userService.createWalletUser(
      registerUser,
      transactionManager,
    );
    const firstRole = savedUser.roles.at(0);

    if (!firstRole) {
      this.logger.error(`User does not have any roles: ${savedUser.id}`);
      throw new InternalServerErrorException();
    }

    await this.createWeb3AuthAccount(
      savedUser.id,
      registerUser.web3AuthAccount,
      transactionManager,
    );

    const userInfo: UserInfo = {
      id: savedUser.id,
      email: savedUser.email,
      roles: savedUser.roles,
      wallet: savedUser.wallet,
      nickname: savedUser.nickname,
      masterId: savedUser.masterId,
      createdAt: savedUser.createdAt,
      playerTag: savedUser.playerTag,
      resetPasswordRequired: savedUser.resetPasswordRequired,
      enable2FA: savedUser.enable2FA,
      partnerMatrixBtag: savedUser.partnerMatrixBtag,
      level: savedUser.level,
      rank: savedUser.rank,
    };

    const { accessToken, refreshToken } =
      await this.authTokenService.generateClientTokens(
        userInfo,
        firstRole.name as Role,
      );

    return {
      token: accessToken,
      refreshToken,
      user: {
        createdAt: savedUser.createdAt,
        id: savedUser.id,
        email: savedUser.email,
        roles: savedUser.roles,
        resetPasswordRequired: savedUser.resetPasswordRequired,
        wallet: savedUser.wallet,
        blockchain: savedUser.blockchain,
        masterId: savedUser.masterId,
        master: null,
        canWithdraw: savedUser.canWithdraw,
        enable2FA: false,
        avatar: savedUser.avatar,
        nickname: savedUser.nickname,
        countryCode: savedUser.countryCode,
        playerTag: savedUser.playerTag,
        active: savedUser.active,
        balance: savedUser.balance,
        maxBetSize: savedUser.maxBetSize,
        favoriteCategory: savedUser.favoriteCategory,
        favoriteGames: savedUser.favoriteGames,
        partnerMatrixId: savedUser.partnerMatrixId,
        partnerMatrixBtag: savedUser.partnerMatrixBtag,
        rank: savedUser.rank,
        level: savedUser.level,
        isBonusEnabled: savedUser.isBonusEnabled,
        signUpEventSent: savedUser.signUpEventSent,
        totalRake: savedUser.totalRake,
      },
    };
  }

  private getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
