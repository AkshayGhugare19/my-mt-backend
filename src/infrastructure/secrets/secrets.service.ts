import { createCipheriv } from 'crypto';
import { ENV } from '@common/env';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';

const SECRETS_CACHE_KEY = 'app:secrets';
const EXISTS = 'exists';

@Injectable()
export class SecretsService {
  constructor(
    private readonly config: ConfigService,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  private async getEncryptedSecretsFromCache(): Promise<Record<
    string,
    string
  > | null> {
    const data = await this.redis.hgetall(SECRETS_CACHE_KEY);
    if (!data[EXISTS]) {
      return null;
    }
    delete data[EXISTS];

    return data;
  }

  private async getEncryptedSecretsFromDatabase(): Promise<
    Record<string, string>
    > {
    const secrets = await this.prisma.secret.findMany();
    return secrets.reduce(
      (acc, secret) => {
        acc[secret.key] = secret.value;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  private async getEncryptedSecrets(): Promise<Record<string, string>> {
    const cached = await this.getEncryptedSecretsFromCache();
    if (!cached) {
      const secrets = await this.getEncryptedSecretsFromDatabase();
      await this.redis.hmset(
        SECRETS_CACHE_KEY,
        ...Object.entries(secrets).flat(),
        EXISTS,
        '1',
      );

      return secrets;
    }

    return cached;
  }

  public encrypt(value: string): string {
    const token = Buffer.from(this.config.getOrThrow(ENV.SECRETS_TOKEN));
    const iv = token.subarray(0, 16);

    const cipher = createCipheriv('aes-256-gcm', token, iv);

    let result = cipher.update(value).toString('hex');
    result += cipher.final().toString('hex');

    return result;
  }

  private decrypt(value: string): string {
    const token = Buffer.from(this.config.getOrThrow(ENV.SECRETS_TOKEN));
    const iv = token.slice(0, 16);

    const decipher = createCipheriv('aes-256-gcm', token, iv);

    let result = decipher.update(value, 'hex').toString();
    result += decipher.final().toString();

    return result;
  }

  public async invalidateCache(): Promise<void> {
    await this.redis.del(SECRETS_CACHE_KEY);
  }

  public async refreshCache(): Promise<void> {
    await this.invalidateCache();
    await this.getEncryptedSecrets();
  }

  public async setSecret(key: string, value: string): Promise<void> {
    await this.setSecrets({ [key]: value });
  }

  public async setSecrets(secrets: Record<string, string>): Promise<void> {
    await Promise.all(
      Object.entries(secrets).map(async ([key, raw]) => {
        const value = this.encrypt(raw);
        await this.prisma.secret.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      }),
    );

    await this.refreshCache();
  }

  public async getSecret(key: string): Promise<string | undefined> {
    const secrets = await this.getEncryptedSecrets();
    if (!secrets[key]) {
      return undefined;
    }

    return this.decrypt(secrets[key]);
  }

  public async getSecretOrFail(key: string): Promise<string> {
    const secret = await this.getSecret(key);
    if (!secret) {
      throw new Error(`Secret ${key} not found`);
    }

    return secret;
  }

  public async getSecretOrDefault(
    key: string,
    defaultValue: string,
  ): Promise<string> {
    return (await this.getSecret(key)) || defaultValue;
  }
}
