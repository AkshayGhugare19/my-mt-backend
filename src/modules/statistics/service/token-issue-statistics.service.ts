import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { Roles } from '@modules/role/enum/role.enum';
import { TokenRequestInitiators } from '@modules/token-issue/enum/token-request-initiator.enum';
import { TokenRequestStatuses } from '@modules/token-issue/enum/token-request-status.enum';
import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { DateTime } from 'luxon';

@Injectable()
export class TokenIssueStatisticsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getTotalMasterTokens(timezone?: string): Promise<Decimal> {
    const startOfWeek = DateTime.now()
      .setZone(timezone || 'UTC')
      .startOf('week')
      .toJSDate();

    const masterTokens = await this.prismaService.tokenIssueRequest.aggregate({
      where: {
        initiator: TokenRequestInitiators.SUPER_MASTER,
        status: TokenRequestStatuses.APPROVED,
        createdAt: {
          gte: startOfWeek,
        },
      },
      _sum: {
        amount: true,
      },
    });
    return masterTokens._sum.amount || new Decimal(0);
  }

  async getAllTimeMasterTokens(): Promise<Decimal> {
    const masterTokens = await this.prismaService.tokenIssueRequest.aggregate({
      where: {
        initiator: TokenRequestInitiators.SUPER_MASTER,
        status: TokenRequestStatuses.APPROVED,
      },
      _sum: {
        amount: true,
      },
    });
    return masterTokens._sum.amount || new Decimal(0);
  }

  async getTotalVipBalances(): Promise<Decimal> {
    const vipBalances = await this.prismaService.balance.aggregate({
      where: {
        user: {
          userRoles: {
            some: {
              role: {
                name: Roles.VIP_USER,
              },
            },
          },
        },
      },
      _sum: {
        balance: true,
      },
    });
    return vipBalances._sum.balance || new Decimal(0);
  }

  async getTotalMasterDebt(): Promise<Decimal> {
    const vipBalances = await this.prismaService.balance.aggregate({
      where: {
        user: {
          userRoles: {
            some: {
              role: {
                name: Roles.MASTER,
              },
            },
          },
        },
      },
      _sum: {
        debt: true,
      },
    });
    return vipBalances._sum.debt || new Decimal(0);
  }

  async readOwnMasterGrossPnl(userId: string): Promise<Decimal> {
    const vipBalances = await this.prismaService.balance.aggregate({
      where: {
        user: {
          masterId: userId,
          userRoles: {
            some: {
              role: {
                name: Roles.VIP_USER,
              },
            },
          },
        },
      },
      _sum: {
        debt: true,
        balance: true,
      },
    });
    return (vipBalances._sum.debt || new Decimal(0)).minus(
      vipBalances._sum.balance || new Decimal(0),
    );
  }

  async readOwnMasterNetPnl(userId: string): Promise<Decimal> {
    const vipBalances = await this.prismaService.balance.findMany({
      where: {
        user: {
          masterId: userId,
          userRoles: {
            some: {
              role: {
                name: Roles.VIP_USER,
              },
            },
          },
        },
      },
      select: {
        balance: true,
        debt: true,
        user: {
          select: {
            userBookieStake: true,
          },
        },
      },
    });
    return vipBalances.reduce((acc, balance) => {
      const difference = balance.debt.minus(balance.balance || new Decimal(0));
      const bookieStake = (balance.user.userBookieStake || new Decimal(0)).mul(
        difference,
      );
      return acc.add(bookieStake);
    }, new Decimal(0));
  }
}
