import { SPORTS_BOOK_ID } from '@common/constants';
import { encryptPassword } from '@common/helper/encoding/password';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { Roles, type Role } from '@modules/role/enum/role.enum';
import { Logger } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { Command, CommandRunner } from 'nest-commander';

@Command({
  name: 'seed',
})
export class SeedCommand extends CommandRunner {
  private readonly _logger = new Logger(SeedCommand.name);

  constructor(
    private readonly prismaService: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.seedRedis();

    this._logger.log('Seeding database for development');

    await this.seedRoles();
    await this.seedSuperMaster();
    await this.seedMasters();

    this._logger.log('Seeding database complete');

    process.exit(0);
  }

  async seedRedis(): Promise<void> {
    this._logger.log('Seeding redis');

    await this.redis.set(SPORTS_BOOK_ID, '123');
  }

  async seedRoles(): Promise<void> {
    this._logger.log('Seeding roles');
    const roles: Role[] = ['USER', 'SUPER_MASTER', 'MASTER'];

    await Promise.all(roles.map(this.seedRole.bind(this)));
  }

  async seedSuperMaster(): Promise<void> {
    this._logger.log('Seeding supermaster account');

    await this.prismaService.user.upsert({
      where: {
        email: 'supermaster@test.com',
      },
      create: {
        nickname: 'supermaster',
        email: 'supermaster@test.com',
        playerTag: 'supermaster',
        password: encryptPassword('supermaster'),
        resetPasswordRequired: false,
        active: true,
        enable2FA: false,
        userRoles: {
          create: {
            role: {
              connect: {
                name: Roles.SUPER_MASTER,
              },
            },
          },
        },
      },
      update: {},
    });
  }

  async seedMasters(): Promise<void> {
    this._logger.log('Seeding master accounts');

    const accounts = Array.from({ length: 10 }, (_, idx) => {
      return `master${idx}`;
    });

    const accountsWithoutEmail = Array.from({ length: 10 }, (_, idx) => {
      return `master_ne${idx}`;
    });

    await Promise.all([
      ...accounts.map((acc) =>
        this.prismaService.user.upsert({
          where: {
            email: `${acc}@test.com`,
          },
          create: {
            nickname: acc,
            email: `${acc}@test.com`,
            playerTag: acc,
            password: encryptPassword('master'),
            resetPasswordRequired: false,
            active: true,
            enable2FA: false,
            userRoles: {
              create: {
                role: {
                  connect: {
                    name: Roles.MASTER,
                  },
                },
              },
            },
            balance: {
              create: {
                balance: 10_000,
                totalDeposit: 10_000,
                totalLoss: 0,
                totalWin: 0,
                totalWithdraw: 0,
              },
            },
            maxBetSize: 100,
            maxExposurePerVip: 1000,
            maxNumberOfUsers: 10,
          },
          update: {},
        }),
      ),
      ...accountsWithoutEmail.map((acc) =>
        this.prismaService.user.upsert({
          where: {
            id: `ne_mid_${acc}`,
          },
          create: {
            id: `ne_mid_${acc}`,
            nickname: acc,
            playerTag: acc,
            password: encryptPassword('master'),
            resetPasswordRequired: false,
            active: true,
            enable2FA: false,
            userRoles: {
              create: {
                role: {
                  connect: {
                    name: Roles.MASTER,
                  },
                },
              },
            },
            balance: {
              create: {
                balance: 10_000,
                totalDeposit: 10_000,
                totalLoss: 0,
                totalWin: 0,
                totalWithdraw: 0,
              },
            },
            maxBetSize: 100,
            maxExposurePerVip: 1000,
            maxNumberOfUsers: 10,
          },
          update: {},
        }),
      ),
    ]);
  }

  async seedRole(role: Role): Promise<void> {
    this._logger.log(`Seeding role '${role}'`);

    await this.prismaService.role.upsert({
      where: {
        name: role,
      },
      create: {
        name: role,
      },
      update: {},
    });
  }
}
