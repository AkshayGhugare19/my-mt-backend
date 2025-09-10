import { ENV } from '@common/env';
import { EvmWeb3Provider } from '@external/evm-web3/provider';
import { SolanaWeb3Provider } from '@external/solana-web3/provider';
import { NotificationCodes } from '@infrastructure/database/prisma/constants';
import {
  ETHEREUM_USDT_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
  ETHEREUM_WITHDRAWAL_WALLET_ETH_ALERT_LEVEL,
  SOLANA_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
  SOLANA_WITHDRAWAL_WALLET_SOL_ALERT_LEVEL,
  TRON_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
  TRON_WITHDRAWAL_WALLET_TRX_ALERT_LEVEL,
  TRON_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
  SOLANA_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
  ETHEREUM_USDC_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
} from '@infrastructure/parameters/config';
import { ParametersService } from '@infrastructure/parameters/parameters.service';
import {
  REDIS_KEY__ETHEREUM_WITHDRAWAL_WALLET_ETH_BALANCE_LAST_CHECK,
  REDIS_KEY__ETHEREUM_WITHDRAWAL_WALLET_USDC_BALANCE_LAST_CHECK,
  REDIS_KEY__ETHEREUM_WITHDRAWAL_WALLET_USDT_BALANCE_LAST_CHECK,
  REDIS_KEY__SOLANA_WITHDRAWAL_WALLET_SOL_BALANCE_LAST_CHECK,
  REDIS_KEY__SOLANA_WITHDRAWAL_WALLET_USDC_BALANCE_LAST_CHECK,
  REDIS_KEY__SOLANA_WITHDRAWAL_WALLET_USDT_BALANCE_LAST_CHECK,
  REDIS_KEY__TRON_WITHDRAWAL_WALLET_TRX_BALANCE_LAST_CHECK,
  REDIS_KEY__TRON_WITHDRAWAL_WALLET_USDC_BALANCE_LAST_CHECK,
  REDIS_KEY__TRON_WITHDRAWAL_WALLET_USDT_BALANCE_LAST_CHECK,
} from '@infrastructure/redis/keys';
import {
  ETHEREUM_WITHDRAWAL_PUBLIC_KEY_SECRET,
  SOLANA_WITHDRAWAL_PUBLIC_KEY_SECRET,
  TRON_WITHDRAW_PUBLIC_KEY_SECRET,
} from '@infrastructure/secrets/config';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { TronTreasuryService } from '@modules/deposits/providers/tron-watcher.provider';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { Roles } from '@modules/role/enum/role.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class WalletManagerCron {
  constructor(
    private readonly secretsService: SecretsService,
    private readonly tronTreasuryService: TronTreasuryService,
    private readonly solanaWeb3Provider: SolanaWeb3Provider,
    private readonly evmWeb3Provider: EvmWeb3Provider,
    private readonly notificationsService: NotificationsService,
    private readonly parameterService: ParametersService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async checkTronWithdrawalWalletUsdtBalance(): Promise<void> {
    try {
      const lastCheck = await this.redis.get(
        REDIS_KEY__TRON_WITHDRAWAL_WALLET_USDT_BALANCE_LAST_CHECK,
      );

      if (lastCheck && Date.now() - Number(lastCheck) < 24 * 60 * 60 * 1000) {
        return;
      }

      const tronWithdrawalAddress = await this.secretsService.getSecretOrFail(
        TRON_WITHDRAW_PUBLIC_KEY_SECRET,
      );

      const usdtBalance = await this.tronTreasuryService.getUsdtBalance(
        tronWithdrawalAddress,
      );

      const alertLevel = await this.parameterService.getParameter(
        TRON_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
      );

      if (!alertLevel || Number(usdtBalance) > alertLevel) {
        return;
      }

      Promise.all([
        this.notificationsService.createNotificationsForRole(
          Roles.SUPER_MASTER,
          NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_USDT_BALANCE,
          undefined,
          {
            limit: alertLevel,
            balance: usdtBalance,
          },
        ),
        this.notificationsService.createNotificationsForRole(
          Roles.ACCOUNTANT,
          NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_USDT_BALANCE,
          undefined,
          {
            limit: alertLevel,
            balance: usdtBalance,
          },
        ),
      ]);

      this.redis.set(
        REDIS_KEY__TRON_WITHDRAWAL_WALLET_USDT_BALANCE_LAST_CHECK,
        Date.now(),
      );
    } catch (error) {
      console.log(error);
    }
  }

  async checkTronWithdrawalWalletUsdcBalance(): Promise<void> {
    try {
      const lastCheck = await this.redis.get(
        REDIS_KEY__TRON_WITHDRAWAL_WALLET_USDC_BALANCE_LAST_CHECK,
      );

      if (lastCheck && Date.now() - Number(lastCheck) < 24 * 60 * 60 * 1000) {
        return;
      }

      const tronWithdrawalAddress = await this.secretsService.getSecretOrFail(
        TRON_WITHDRAW_PUBLIC_KEY_SECRET,
      );

      const usdcBalance = await this.tronTreasuryService.getUsdcBalance(
        tronWithdrawalAddress,
      );

      const alertLevel = await this.parameterService.getParameter(
        TRON_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
      );

      if (!alertLevel || Number(usdcBalance) > alertLevel) {
        return;
      }

      Promise.all([
        this.notificationsService.createNotificationsForRole(
          Roles.SUPER_MASTER,
          NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_USDC_BALANCE,
          undefined,
          {
            limit: alertLevel,
            balance: usdcBalance,
          },
        ),
        this.notificationsService.createNotificationsForRole(
          Roles.ACCOUNTANT,
          NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_USDC_BALANCE,
          undefined,
          {
            limit: alertLevel,
            balance: usdcBalance,
          },
        ),
      ]);

      this.redis.set(
        REDIS_KEY__TRON_WITHDRAWAL_WALLET_USDC_BALANCE_LAST_CHECK,
        Date.now(),
      );
    } catch (error) {
      console.log(error);
    }
  }

  async checkTronWithdrawalWalletTrxBalance(): Promise<void> {
    try {
      const lastCheck = await this.redis.get(
        REDIS_KEY__TRON_WITHDRAWAL_WALLET_TRX_BALANCE_LAST_CHECK,
      );

      if (lastCheck && Date.now() - Number(lastCheck) < 24 * 60 * 60 * 1000) {
        return;
      }

      const tronWithdrawalAddress = await this.secretsService.getSecretOrFail(
        TRON_WITHDRAW_PUBLIC_KEY_SECRET,
      );

      const trxBalance = await this.tronTreasuryService.getTrxBalance(
        tronWithdrawalAddress,
      );

      const alertLevel = await this.parameterService.getParameter(
        TRON_WITHDRAWAL_WALLET_TRX_ALERT_LEVEL,
      );

      if (!alertLevel || Number(trxBalance) > alertLevel) {
        return;
      }

      Promise.all([
        this.notificationsService.createNotificationsForRole(
          Roles.SUPER_MASTER,
          NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_TRX_BALANCE,
          undefined,
          {
            limit: alertLevel,
            balance: trxBalance,
          },
        ),
        this.notificationsService.createNotificationsForRole(
          Roles.ACCOUNTANT,
          NotificationCodes.WARNING_TRON_WITHDRAWAL_WALLET_TRX_BALANCE,
          undefined,
          {
            limit: alertLevel,
            balance: trxBalance,
          },
        ),
      ]);

      this.redis.set(
        REDIS_KEY__TRON_WITHDRAWAL_WALLET_TRX_BALANCE_LAST_CHECK,
        Date.now(),
      );
    } catch (error) {
      console.log(error);
    }
  }

  async checkSolanaWithdrawalWalletUsdtBalance(): Promise<void> {
    const lastCheck = await this.redis.get(
      REDIS_KEY__SOLANA_WITHDRAWAL_WALLET_USDT_BALANCE_LAST_CHECK,
    );

    if (lastCheck && Date.now() - Number(lastCheck) < 24 * 60 * 60 * 1000) {
      return;
    }

    const solanaWithdrawalAddress = await this.secretsService.getSecretOrFail(
      SOLANA_WITHDRAWAL_PUBLIC_KEY_SECRET,
    );

    const usdtBalance = await this.solanaWeb3Provider.getTokenBalance(
      solanaWithdrawalAddress,
      'USDT'
    );

    const alertLevel = await this.parameterService.getParameter(
      SOLANA_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
    );

    if (!alertLevel || Number(usdtBalance) > alertLevel) {
      return;
    }

    Promise.all([
      this.notificationsService.createNotificationsForRole(
        Roles.SUPER_MASTER,
        NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_USDT_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: usdtBalance,
        },
      ),
      this.notificationsService.createNotificationsForRole(
        Roles.ACCOUNTANT,
        NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_USDT_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: usdtBalance,
        },
      ),
    ]);

    this.redis.set(
      REDIS_KEY__SOLANA_WITHDRAWAL_WALLET_USDT_BALANCE_LAST_CHECK,
      Date.now(),
    );
  }

  async checkSolanaWithdrawalWalletUsdcBalance(): Promise<void> {
    const lastCheck = await this.redis.get(
      REDIS_KEY__SOLANA_WITHDRAWAL_WALLET_USDC_BALANCE_LAST_CHECK,
    );

    if (lastCheck && Date.now() - Number(lastCheck) < 24 * 60 * 60 * 1000) {
      return;
    }

    const solanaWithdrawalAddress = await this.secretsService.getSecretOrFail(
      SOLANA_WITHDRAWAL_PUBLIC_KEY_SECRET,
    );

    const usdcBalance = await this.solanaWeb3Provider.getTokenBalance(
      solanaWithdrawalAddress,
      'USDC'
    );

    const alertLevel = await this.parameterService.getParameter(
      SOLANA_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
    );

    if (!alertLevel || Number(usdcBalance) > alertLevel) {
      return;
    }

    Promise.all([
      this.notificationsService.createNotificationsForRole(
        Roles.SUPER_MASTER,
        NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_USDC_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: usdcBalance,
        },
      ),
      this.notificationsService.createNotificationsForRole(
        Roles.ACCOUNTANT,
        NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_USDC_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: usdcBalance,
        },
      ),
    ]);

    this.redis.set(
      REDIS_KEY__SOLANA_WITHDRAWAL_WALLET_USDC_BALANCE_LAST_CHECK,
      Date.now(),
    );
  }

  async checkSolanaWithdrawalWalletSolBalance(): Promise<void> {
    const lastCheck = await this.redis.get(
      REDIS_KEY__SOLANA_WITHDRAWAL_WALLET_SOL_BALANCE_LAST_CHECK,
    );

    if (lastCheck && Date.now() - Number(lastCheck) < 24 * 60 * 60 * 1000) {
      return;
    }

    const solanaWithdrawalAddress = await this.secretsService.getSecretOrFail(
      SOLANA_WITHDRAWAL_PUBLIC_KEY_SECRET,
    );

    const solBalance = await this.solanaWeb3Provider.getSolBalance(
      solanaWithdrawalAddress,
    );

    const alertLevel = await this.parameterService.getParameter(
      SOLANA_WITHDRAWAL_WALLET_SOL_ALERT_LEVEL,
    );

    if (!alertLevel || Number(solBalance) > alertLevel) {
      return;
    }

    Promise.all([
      this.notificationsService.createNotificationsForRole(
        Roles.SUPER_MASTER,
        NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_SOL_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: solBalance,
        },
      ),
      this.notificationsService.createNotificationsForRole(
        Roles.ACCOUNTANT,
        NotificationCodes.WARNING_SOLANA_WITHDRAWAL_WALLET_SOL_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: solBalance,
        },
      ),
    ]);

    this.redis.set(
      REDIS_KEY__SOLANA_WITHDRAWAL_WALLET_SOL_BALANCE_LAST_CHECK,
      Date.now(),
    );
  }

  async checkEthereumWithdrawalWalletUsdtBalance(): Promise<void> {
    const lastCheck = await this.redis.get(
      REDIS_KEY__ETHEREUM_WITHDRAWAL_WALLET_USDT_BALANCE_LAST_CHECK,
    );

    if (lastCheck && Date.now() - Number(lastCheck) < 24 * 60 * 60 * 1000) {
      return;
    }

    const ethereumWithdrawalAddress = await this.secretsService.getSecretOrFail(
      ETHEREUM_WITHDRAWAL_PUBLIC_KEY_SECRET,
    );

    const usdtBalance = await this.evmWeb3Provider.getTokenBalance(
      ethereumWithdrawalAddress,
      'USDT'
    );

    const alertLevel = await this.parameterService.getParameter(
      ETHEREUM_USDT_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
    );

    if (!alertLevel || Number(usdtBalance) > alertLevel) {
      return;
    }

    Promise.all([
      this.notificationsService.createNotificationsForRole(
        Roles.SUPER_MASTER,
        NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDT_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: usdtBalance,
        },
      ),
      this.notificationsService.createNotificationsForRole(
        Roles.ACCOUNTANT,
        NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDT_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: usdtBalance,
        },
      ),
    ]);

    this.redis.set(
      REDIS_KEY__ETHEREUM_WITHDRAWAL_WALLET_USDT_BALANCE_LAST_CHECK,
      Date.now(),
    );
  }

  async checkEthereumWithdrawalWalletUsdcBalance(): Promise<void> {
    const lastCheck = await this.redis.get(
      REDIS_KEY__ETHEREUM_WITHDRAWAL_WALLET_USDC_BALANCE_LAST_CHECK,
    );

    if (lastCheck && Date.now() - Number(lastCheck) < 24 * 60 * 60 * 1000) {
      return;
    }

    const ethereumWithdrawalAddress = await this.secretsService.getSecretOrFail(
      ETHEREUM_WITHDRAWAL_PUBLIC_KEY_SECRET,
    );

    const usdcBalance = await this.evmWeb3Provider.getTokenBalance(
      ethereumWithdrawalAddress,
      'USDC'
    );

    const alertLevel = await this.parameterService.getParameter(
      ETHEREUM_USDC_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
    );

    if (!alertLevel || Number(usdcBalance) > alertLevel) {
      return;
    }

    Promise.all([
      this.notificationsService.createNotificationsForRole(
        Roles.SUPER_MASTER,
        NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDC_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: usdcBalance,
        },
      ),
      this.notificationsService.createNotificationsForRole(
        Roles.ACCOUNTANT,
        NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_USDC_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: usdcBalance,
        },
      ),
    ]);

    this.redis.set(
      REDIS_KEY__ETHEREUM_WITHDRAWAL_WALLET_USDC_BALANCE_LAST_CHECK,
      Date.now(),
    );
  }

  async checkEthereumWithdrawalWalletEthBalance(): Promise<void> {
    const lastCheck = await this.redis.get(
      REDIS_KEY__ETHEREUM_WITHDRAWAL_WALLET_ETH_BALANCE_LAST_CHECK,
    );

    if (lastCheck && Date.now() - Number(lastCheck) < 24 * 60 * 60 * 1000) {
      return;
    }

    const ethereumWithdrawalAddress = await this.secretsService.getSecretOrFail(
      ETHEREUM_WITHDRAWAL_PUBLIC_KEY_SECRET,
    );

    const ethBalance = await this.evmWeb3Provider.getEthBalance(
      ethereumWithdrawalAddress,
    );

    const alertLevel = await this.parameterService.getParameter(
      ETHEREUM_WITHDRAWAL_WALLET_ETH_ALERT_LEVEL,
    );

    if (!alertLevel || Number(ethBalance) > alertLevel) {
      return;
    }

    Promise.all([
      this.notificationsService.createNotificationsForRole(
        Roles.SUPER_MASTER,
        NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_ETH_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: ethBalance,
        },
      ),
      this.notificationsService.createNotificationsForRole(
        Roles.ACCOUNTANT,
        NotificationCodes.WARNING_ETHEREUM_WITHDRAWAL_WALLET_ETH_BALANCE,
        undefined,
        {
          limit: alertLevel,
          balance: ethBalance,
        },
      ),
    ]);

    this.redis.set(
      REDIS_KEY__ETHEREUM_WITHDRAWAL_WALLET_ETH_BALANCE_LAST_CHECK,
      Date.now(),
    );
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  checkWithdrawalWalletsBalances(): void {
    if (
      this.configService.get(ENV.DISABLE_CRON_CHECK_WITHDRAWAL_WALLETS_BALANCES)
    ) {
      return;
    }
    const checkPromises = [
      this.checkTronWithdrawalWalletUsdtBalance(),
      this.checkTronWithdrawalWalletTrxBalance(),
      this.checkSolanaWithdrawalWalletUsdtBalance(),
      this.checkSolanaWithdrawalWalletUsdcBalance(),
      this.checkSolanaWithdrawalWalletSolBalance(),
      this.checkEthereumWithdrawalWalletUsdtBalance(),
      this.checkEthereumWithdrawalWalletUsdcBalance(),
      this.checkEthereumWithdrawalWalletEthBalance(),
    ];

    Promise.allSettled(checkPromises);
  }
}
