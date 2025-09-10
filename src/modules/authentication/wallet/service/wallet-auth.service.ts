import { ONE_MINUTE_IN_MS, WALLET_LOGIN_NONCE } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { Role } from '@modules/role/enum/role.enum';
import { LoginResponse } from '@modules/authentication/types';
import { UserService } from '@modules/user/services/user.service';
import { CreateWalletUser, UserInfo } from '@modules/user/types';
import { WalletService } from '@modules/wallet/service/wallet.service';
import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { randomBytes } from 'crypto';
import { Redis } from 'ioredis';
import { AuthTokenService } from '@modules/authentication/core/service/auth-token.service';
import { TronWeb } from 'tronweb';
import { isPublicKey } from '@metaplex-foundation/umi';
import { Blockchain } from '@infrastructure/database/prisma/constants';
import { EventNamespace } from '@infrastructure/event/namespace';
import { UserLoginEvent, UserRegisterEvent } from '@infrastructure/event/classes';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EvenBetService } from '@modules/betting-providers/evenbet/service/evenbet.service';
import { isAddress } from 'web3-validator';
import { CORE_JWT_SERVICE } from '@modules/authentication/core/constants';

@Injectable()
export class WalletAuthService {
  private readonly logger = new Logger(WalletAuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly walletService: WalletService,
    @Inject(CORE_JWT_SERVICE)
    protected readonly jwtService: JwtService,
    protected readonly configService: ConfigService,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
    private readonly authTokenService: AuthTokenService,
    private readonly evenbetService: EvenBetService,
  ) {}

  async getNonce(walletAddress: string): Promise<{ nonce: string; expiresAt: Date }> {
    const nonce = this.generateNonce();
    const issuedAt = new Date().getTime();
    await this.redis.set(`${WALLET_LOGIN_NONCE}:${walletAddress}`, nonce, 'PX', ONE_MINUTE_IN_MS);
    return {
      nonce,
      expiresAt: new Date(issuedAt + ONE_MINUTE_IN_MS),
    };
  }

  private generateNonce(): string {
    return randomBytes(12).toString('base64');
  }

  async authenticateWalletBySignature(params: {
    wallet: string;
    signature: string;
    userId?: string;
    partnerMatrixBtag?: string;
    countryCode?: string;
  }): Promise<LoginResponse> {
    const { wallet, signature, userId, partnerMatrixBtag, countryCode } = params;
    await this.validateLoginSignature(wallet, signature);
    return this.walletLogin({ wallet, userId, partnerMatrixBtag, countryCode });
  }

  async walletLogin(
    params: {wallet: string,
    userId?: string,
    partnerMatrixBtag?: string,
    countryCode?: string,}
  ): Promise<LoginResponse> {
    const { wallet, userId, partnerMatrixBtag, countryCode } = params;

    const existingUser = await this.userService.findByWallet(wallet);

    // There is no user with that wallet in our db
    if (!existingUser) {
      return await this.registerWallet({ wallet, userId, partnerMatrixBtag, countryCode });
    }

    // There is a user with this wallet and the user is not logged in => log them in
    if (!userId) {
      return this.login(existingUser.id, countryCode);
    }

    // There is a user with this wallet and the user is logged in, but the ids don't match => throw error
    if (existingUser.id !== userId) {
      throw new BadRequestException(ErrorMessages.WALLET_ALREADY_IN_USE);
    }

    // The user is already logged in, return user info

    const userInfo = await this.userService.getUserInfoOrThrow(existingUser.id);

    if (!userInfo.countryCode && countryCode) {
      const updatedUser = await this.userService.updateById(existingUser.id, { countryCode });
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

    this.eventEmitter.emit(
      EventNamespace.USER_LOGIN,
      new UserLoginEvent({
        playerId: userInfo.id,
        date: new Date().toISOString(),
      }),
    );

    return {
      token: null,
      refreshToken: null,
      user: userInfo,
    };
  }

  /**
   *
   * @param userId
   * @returns - {@link LoginResponse}
   * @throws - {@link NotFoundException} if user is not found
   */
  private async login(userId: string, countryCode?: string): Promise<LoginResponse> {
    const userInfo = await this.userService.getUserInfoOrThrow(userId);
    const firstRole = userInfo.roles.at(0);

    if (!userInfo.countryCode && countryCode) {
      const updatedUser = await this.userService.updateById(userId, { countryCode });
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

    if (!firstRole) {
      this.logger.error(`User does not have any roles: ${userInfo.id}`);
      throw new InternalServerErrorException();
    }

    const { accessToken, refreshToken } = await this.authTokenService.generateClientTokens(
      userInfo,
      firstRole.name as Role,
    );

    this.eventEmitter.emit(
      EventNamespace.USER_LOGIN,
      new UserLoginEvent({
        playerId: userInfo.id,
        date: new Date().toISOString(),
      }),
    );

    // TODO: this is temporary; should be done when invalidating previous refresh token
    try {
      await this.evenbetService.logout(userInfo.id).catch(() => {});
    } catch (e) {
      this.logger.error('Failed to reset evenbet session');
    }

    return {
      token: accessToken,
      refreshToken,
      user: userInfo,
    };
  }

  /**
   *
   * @param wallet
   * @param userId
   * @returns - {@link LoginResponse}
   * @throws - {@link BadRequestException} if the wallet is already in use
   */
  private async registerWallet(params: {wallet: string, userId?: string, partnerMatrixBtag?: string, countryCode?: string}): Promise<LoginResponse> {
    const { wallet, userId, partnerMatrixBtag, countryCode } = params;
    let blockchain: number;

    switch (true) {
      case TronWeb.isAddress(wallet): {
        blockchain = Blockchain.Tron;
        break;
      }
      case isPublicKey(wallet): {
        blockchain = Blockchain.Solana;
        break;
      }
      case isAddress(wallet): {
        blockchain = Blockchain.Ethereum;
        break;
      }
      default: {
        throw new Error('Invalid wallet');
      }
    }

    // If the user is not logged in and the wallet is not in use, register the user
    if (!userId) {
      // eslint-disable-next-line sonarjs/prefer-immediate-return
      const registerResult = await this.registerWalletUser({
        wallet,
        blockchain,
        partnerMatrixBtag,
        countryCode,
      });

      this.eventEmitter.emit(
        EventNamespace.USER_REGISTER,
        new UserRegisterEvent({
          playerTag: registerResult.user.playerTag,
          nickname: registerResult.user.nickname || undefined,
          pmBtag: partnerMatrixBtag,
          pmId: registerResult.user.partnerMatrixId || undefined,
          countryCode: registerResult.user.countryCode || undefined,
        }),
      );

      this.eventEmitter.emit(
        EventNamespace.USER_LOGIN,
        new UserLoginEvent({
          playerId: registerResult.user.id,
          date: new Date().toISOString(),
        }),
      );

      return registerResult;
    }

    const user = await this.userService.getUserInfoOrThrow(userId);

    // The user is logged in and has no wallet registered
    if (!user.wallet) {
      return await this.linkWalletToUser(wallet, blockchain, userId);
    }

    // The user is logged in and has a different wallet registered
    if (user.wallet !== wallet) {
      throw new BadRequestException(ErrorMessages.DIFFERENT_WALLET_REGISTERED_TO_ACCOUNT);
    }

    if (!user.countryCode && countryCode) {
      const updatedUser = await this.userService.updateById(userId, { countryCode });
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

    this.eventEmitter.emit(
      EventNamespace.USER_LOGIN,
      new UserLoginEvent({
        playerId: user.id,
        date: new Date().toISOString(),
      }),
    );

    // The user is logged in and has the same wallet registered
    return {
      token: null,
      refreshToken: null,
      user,
    };
  }

  /**
   *
   * @param wallet
   * @param signature
   * @returns - void
   * @throws - {@link BadRequestException} message: {@link ErrorMessages.INVALID_LOGIN_NONCE} if the nonce is not found or the signature is invalid
   * @throws - {@link BadRequestException} message: {@link ErrorMessages.INVALID_LOGIN_SIGNATURE} if the signature is invalid
   */
  private async validateLoginSignature(wallet: string, signature: string): Promise<void> {
    const nonce = await this.redis.get(`${WALLET_LOGIN_NONCE}:${wallet}`);

    if (!nonce) {
      throw new BadRequestException(ErrorMessages.INVALID_LOGIN_NONCE);
    }
    const loginMessage = Buffer.from(`${wallet}:${nonce}`).toString('base64');

    const isValid =
      this.walletService.validateTronSignature(wallet, loginMessage, signature) ||
      this.walletService.validateSolanaSignature(wallet, loginMessage, signature) ||
      this.walletService.validateEthereumSignature(wallet, loginMessage, signature);

    if (!isValid) {
      throw new BadRequestException(ErrorMessages.INVALID_LOGIN_SIGNATURE);
    }

    await this.redis.del(`${WALLET_LOGIN_NONCE}:${wallet}`);
  }

  /**
   *
   * @param wallet
   * @param userId
   * @returns - {@link UserWithBalance}
   * @throws - {@link InternalServerErrorException} if linking wallet to user fails
   */
  private async linkWalletToUser(wallet: string, blockchain: number, userId: string): Promise<LoginResponse> {
    await this.userService.linkWalletToUser(wallet, blockchain, userId);

    const userInfo = await this.userService.getUserInfoOrThrow(userId);

    if (!userInfo) {
      this.logger.error(new Error(`Failed to link user with id ${userId} with wallet ${wallet}`), 'registerWallet');
      throw new InternalServerErrorException();
    }
    const firstRole = userInfo.roles.at(0);

    if (!firstRole) {
      this.logger.error(`User does not have any roles: ${userInfo.id}`);
      throw new InternalServerErrorException();
    }
    const { accessToken, refreshToken } = await this.authTokenService.generateClientTokens(
      userInfo,
      firstRole.name as Role,
    );
    return {
      token: accessToken,
      refreshToken,
      user: userInfo,
    };
  }

  private async registerWalletUser(registerUser: CreateWalletUser): Promise<LoginResponse> {
    const savedUser = await this.userService.createWalletUser(registerUser);
    const firstRole = savedUser.roles.at(0);

    if (!firstRole) {
      this.logger.error(`User does not have any roles: ${savedUser.id}`);
      throw new InternalServerErrorException();
    }

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

    const { accessToken, refreshToken } = await this.authTokenService.generateClientTokens(
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
        countryCode: savedUser.countryCode,
        master: null,
        canWithdraw: savedUser.canWithdraw,
        enable2FA: false,
        avatar: savedUser.avatar,
        nickname: savedUser.nickname,
        playerTag: savedUser.playerTag,
        active: savedUser.active,
        balance: savedUser.balance,
        maxBetSize: savedUser.maxBetSize,
        favoriteCategory: savedUser.favoriteCategory,
        favoriteGames: savedUser.favoriteGames,
        partnerMatrixId: savedUser.partnerMatrixId,
        partnerMatrixBtag: savedUser.partnerMatrixBtag,
        isBonusEnabled: savedUser.isBonusEnabled,
        signUpEventSent: savedUser.signUpEventSent,
        totalRake: savedUser.totalRake,
        level: savedUser.level,
        rank: savedUser.rank,
      },
    };
  }
}
