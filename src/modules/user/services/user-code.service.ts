import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import { parseDuration } from '@common/helper/time/parser';
import {
  generateAlphaNumericalCode,
  generateNumericalCode,
} from '@common/helper/encoding/code';
import { ONE_MINUTE_IN_MS } from '@common/constants';
import { User, UserCode } from '@prisma/client';
import { CodeType } from '@modules/user/enum/code-type.enum';

@Injectable()
export class UserCodeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) { }

  getTwoFactorAuthenticationCode(): { code: string; expiryDate: Date } {
    const duration = parseDuration(
      this.configService.get<string>(ENV.TWO_FACTOR_AUTHENTICATION_CODE_DURATION),
    );
    const code = generateNumericalCode(6);

    return {
      code,
      expiryDate: new Date(Date.now() + (duration || 5 * ONE_MINUTE_IN_MS)),
    };
  }

  getAccountVerificationCode(): { code: string; expiryDate: Date } {
    const duration = parseDuration(
      this.configService.get<string>(ENV.ACCOUNT_VERIFICATION_CODE_DURATION),
    );
    const code = generateNumericalCode(6);

    return {
      code,
      expiryDate: new Date(Date.now() + (duration || 50 * ONE_MINUTE_IN_MS)),
    };
  }

  getForgotPasswordCode(): { code: string; expiryDate: Date } {
    const duration = parseDuration(
      this.configService.get<string>(ENV.FORGOT_PASSWORD_CODE_DURATION),
    );
    const code = generateAlphaNumericalCode(8);

    return {
      code,
      expiryDate: new Date(Date.now() + (duration || 5 * ONE_MINUTE_IN_MS)),
    };
  }

  async upsert(
    data: Pick<UserCode, 'code' | 'codeType' | 'userId' | 'expiresAt'>,
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserCode | undefined> {
    const client = this.getClient(transactionManager);

    const userCode = await client.userCode.upsert({
      where: {
        userId_codeType: {
          userId: data.userId,
          codeType: data.codeType,
        },
      },
      update: {
        code: data.code,
        expiresAt: data.expiresAt,
      },
      create: data,
    });

    return userCode || undefined;
  }

  async findByCodeAndCodeType(
    code: string,
    type: CodeType,
  ): Promise<
    | (Pick<UserCode, 'code' | 'id' | 'expiresAt' | 'userId'> & {
      user: Pick<User, 'email'>;
    })
    | undefined
  > {
    const userCode = await this.prismaService.userCode.findFirst({
      where: {
        code,
        codeType: type,
      },
      select: {
        id: true,
        code: true,
        expiresAt: true,
        userId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });
    return userCode || undefined;
  }

  async findByUserIdAndType(
    userId: string,
    type: CodeType,
    transactionManager?: PrismaTransactionManager,
  ): Promise<UserCode | undefined> {
    const client = this.getClient(transactionManager);

    const userCode = await client.userCode.findUnique({
      where: {
        userId_codeType: {
          userId,
          codeType: type,
        },
      },
    });

    return userCode || undefined;
  }

  async deleteById(
    id: number,
    transactionManager?: PrismaTransactionManager,
  ): Promise<void> {
    const client = this.getClient(transactionManager);

    await client.userCode.delete({
      where: {
        id,
      },
    });
  }

  private getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
