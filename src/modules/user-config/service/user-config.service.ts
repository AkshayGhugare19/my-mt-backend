import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserConfigService {
  constructor(private readonly prismaService: PrismaService) {}

  async isUserBonusEnabled(
    userId: string,
    transactionManager?: PrismaTransactionManager,
  ): Promise<boolean> {
    const client = this.getClient(transactionManager);
    const user = await client.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        isBonusEnabled: true,
      },
    });

    if (!user) {
      return false;
    }

    // if the user isBonusEnabled is false, then the bonus is disabled
    return user.isBonusEnabled !== false;
  }

  private getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
