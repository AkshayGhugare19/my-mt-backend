import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PermissionService } from '@modules/permission/service/permission.service';
import { runIfPermission } from '@modules/permission/utils/run-if-permission';
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import {
  ETHEREUM_USDT_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
  ETHEREUM_WITHDRAWAL_WALLET_ETH_ALERT_LEVEL,
  SOLANA_FEES_WALLET_ALERT_LEVEL,
  SOLANA_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
  SOLANA_WITHDRAWAL_WALLET_SOL_ALERT_LEVEL,
  TRON_FEES_WALLET_ALERT_LEVEL,
  TRON_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
  TRON_WITHDRAWAL_WALLET_TRX_ALERT_LEVEL,
  TRON_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
  SOLANA_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
  ETHEREUM_USDC_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
} from './config';
import {
  Permission,
  Permissions,
} from '@modules/permission/enum/permission.enum';
import { Parameters } from './types';
import { UpdateParametersDto } from './dtos/update-parameter.dto';

const PARAMETERS_CACHE_KEY = 'app:parameters';
const EXISTS = 'exists';

@Injectable()
export class ParametersService {
  constructor(
    private readonly permissionService: PermissionService,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  private async getParametersFromCache(): Promise<Record<
    string,
    number
  > | null> {
    const data = await this.redis.hgetall(PARAMETERS_CACHE_KEY);
    if (!data[EXISTS]) {
      return null;
    }
    delete data[EXISTS];

    const result: Record<string, number> = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, Number(value)]),
    );

    return result;
  }

  private async getParametersFromDatabase(): Promise<Record<string, number>> {
    const parameters = await this.prisma.parameter.findMany();
    return parameters.reduce(
      (acc, parameter) => {
        acc[parameter.key] = Number(parameter.value);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private async getParameters(): Promise<Record<string, number>> {
    const cached = await this.getParametersFromCache();
    if (!cached) {
      const parameters = await this.getParametersFromDatabase();
      await this.redis.hmset(
        PARAMETERS_CACHE_KEY,
        ...Object.entries(parameters).flat(),
        EXISTS,
        '1',
      );

      return parameters;
    }

    return cached;
  }

  public async invalidateCache(): Promise<void> {
    await this.redis.del(PARAMETERS_CACHE_KEY);
  }

  public async refreshCache(): Promise<void> {
    await this.invalidateCache();
    await this.getParameters();
  }

  public async setParameter(key: string, value: string): Promise<void> {
    await this.setParameters({ [key]: value });
  }

  public async setParameters(
    parameters: Record<string, string>,
  ): Promise<void> {
    await Promise.all(
      Object.entries(parameters).map(async ([key, raw]) => {
        await this.prisma.parameter.upsert({
          where: { key },
          create: { key, value: raw },
          update: { value: raw },
        });
      }),
    );

    await this.refreshCache();
  }

  public async getParameter(key: string): Promise<number | undefined> {
    const parameters = await this.getParameters();
    if (!parameters[key]) {
      return undefined;
    }

    return parameters[key];
  }

  public async getParameterOrFail(key: string): Promise<number> {
    const parameter = await this.getParameter(key);
    if (!parameter) {
      throw new Error(`Parameter ${key} not found`);
    }

    return parameter;
  }

  public async getParameterOrDefault(
    key: string,
    defaultValue: number,
  ): Promise<number> {
    return (await this.getParameter(key)) || defaultValue;
  }

  async getAllParameters(userId: string): Promise<Parameters> {
    const permissions = await this.permissionService.getUserPermissions(userId);

    const parameterPermissions =
      await this.getParameterPermissions(permissions);

    const [
      withdrawalTronWalletAlertLevel,
      withdrawalTronUsdtWalletAlertLevel,
      withdrawalTronUsdcWalletAlertLevel,
      feesTronWalletAlertLevel,
      withdrawalSolanaWalletAlertLevel,
      withdrawalSolanaUsdtWalletAlertLevel,
      withdrawalSolanaUsdcWalletAlertLevel,
      feesSolanaWalletAlertLevel,
      withdrawalEthWalletAlertLevel,
      withdrawalEthUsdtWalletAlertLevel,
      withdrawalEthUsdcWalletAlertLevel,
    ] = await Promise.all([
      runIfPermission(
        parameterPermissions.readParameter,
        async () =>
          await this.getParameter(TRON_WITHDRAWAL_WALLET_TRX_ALERT_LEVEL),
      ),
      runIfPermission(
        parameterPermissions.readParameter,
        async () =>
          await this.getParameter(TRON_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL),
      ),
      runIfPermission(
        parameterPermissions.readParameter,
        async () =>
          await this.getParameter(TRON_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL),
      ),
      runIfPermission(
        parameterPermissions.readParameter,
        async () => await this.getParameter(TRON_FEES_WALLET_ALERT_LEVEL),
      ),
      runIfPermission(
        parameterPermissions.readParameter,
        async () =>
          await this.getParameter(SOLANA_WITHDRAWAL_WALLET_SOL_ALERT_LEVEL),
      ),
      runIfPermission(
        parameterPermissions.readParameter,
        async () =>
          await this.getParameter(SOLANA_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL),
      ),
      runIfPermission(
        parameterPermissions.readParameter,
        async () =>
          await this.getParameter(SOLANA_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL),
      ),
      runIfPermission(
        parameterPermissions.readParameter,
        async () => await this.getParameter(SOLANA_FEES_WALLET_ALERT_LEVEL),
      ),
      runIfPermission(
        parameterPermissions.readParameter,
        async () =>
          await this.getParameter(ETHEREUM_WITHDRAWAL_WALLET_ETH_ALERT_LEVEL),
      ),
      runIfPermission(
        parameterPermissions.readParameter,
        async () =>
          await this.getParameter(
            ETHEREUM_USDT_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
          ),
      ),
      runIfPermission(
        parameterPermissions.readParameter,
        async () =>
          await this.getParameter(ETHEREUM_USDC_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL),
      ),
    ]);

    return {
      withdrawalTronWalletAlertLevel: Number(withdrawalTronWalletAlertLevel),
      withdrawalTronUsdtWalletAlertLevel: Number(
        withdrawalTronUsdtWalletAlertLevel,
      ),
      withdrawalTronUsdcWalletAlertLevel: Number(
        withdrawalTronUsdcWalletAlertLevel,
      ),
      feesTronWalletAlertLevel: Number(feesTronWalletAlertLevel),
      withdrawalSolanaWalletAlertLevel: Number(
        withdrawalSolanaWalletAlertLevel,
      ),
      withdrawalSolanaUsdtWalletAlertLevel: Number(
        withdrawalSolanaUsdtWalletAlertLevel,
      ),
      withdrawalSolanaUsdcWalletAlertLevel: Number(
        withdrawalSolanaUsdcWalletAlertLevel,
      ),
      feesSolanaWalletAlertLevel: Number(feesSolanaWalletAlertLevel),
      withdrawalEthWalletAlertLevel: Number(withdrawalEthWalletAlertLevel),
      withdrawalEthUsdtWalletAlertLevel: Number(
        withdrawalEthUsdtWalletAlertLevel,
      ),
      withdrawalEthUsdcWalletAlertLevel: Number(
        withdrawalEthUsdcWalletAlertLevel,
      ),
    };
  }

  private async getParameterPermissions(permissions: Permission[]): Promise<{
    readParameter: boolean;
    editParameter: boolean;
  }> {
    return {
      readParameter: permissions.some(
        (permission) => permission === Permissions.READ_PARAMETERS,
      ),
      editParameter: permissions.some(
        (permission) => permission === Permissions.EDIT_PARAMETERS,
      ),
    };
  }

  public async updateParameters(
    updateData: UpdateParametersDto,
  ): Promise<void> {
    const parametersToUpdate = [
      {
        key: TRON_WITHDRAWAL_WALLET_TRX_ALERT_LEVEL,
        value: updateData.withdrawalTronWalletAlertLevel,
      },
      {
        key: TRON_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
        value: updateData.withdrawalTronUsdtWalletAlertLevel,
      },
      {
        key: TRON_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
        value: updateData.withdrawalTronUsdcWalletAlertLevel,
      },
      {
        key: TRON_FEES_WALLET_ALERT_LEVEL,
        value: updateData.feesTronWalletAlertLevel,
      },
      {
        key: SOLANA_WITHDRAWAL_WALLET_SOL_ALERT_LEVEL,
        value: updateData.withdrawalSolanaWalletAlertLevel,
      },
      {
        key: SOLANA_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
        value: updateData.withdrawalSolanaUsdtWalletAlertLevel,
      },
      {
        key: SOLANA_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
        value: updateData.withdrawalSolanaUsdcWalletAlertLevel,
      },
      {
        key: SOLANA_FEES_WALLET_ALERT_LEVEL,
        value: updateData.feesSolanaWalletAlertLevel,
      },
      {
        key: ETHEREUM_WITHDRAWAL_WALLET_ETH_ALERT_LEVEL,
        value: updateData.withdrawalEthWalletAlertLevel,
      },
      {
        key: ETHEREUM_USDT_WITHDRAWAL_WALLET_USDT_ALERT_LEVEL,
        value: updateData.withdrawalEthUsdtWalletAlertLevel,
      },
      {
        key: ETHEREUM_USDC_WITHDRAWAL_WALLET_USDC_ALERT_LEVEL,
        value: updateData.withdrawalEthUsdcWalletAlertLevel,
      },
    ];

    for (const param of parametersToUpdate) {
      if (param.value !== undefined) {
        await this.setParameter(param.key, param.value.toString());
      }
    }
  }
}
