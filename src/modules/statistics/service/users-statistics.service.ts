import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { StatisticsTarget } from '@modules/statistics/enum/statistics-target.enum';
import { UserStatisticsOptions } from '@modules/statistics/types';
import { convertStatisticsTargetToRole } from '@modules/statistics/utils/convert-statistics-target-to-role';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DateTime } from 'luxon';

@Injectable()
export class UsersStatisticsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getTotalUsersCount({
    target = 'all',
    masterId,
  }: {
    masterId?: string;
    target: StatisticsTarget;
  }): Promise<number> {
    return this.prismaService.user.count({
      where: {
        masterId,
        userRoles: {
          some: {
            role: {
              name: {
                in: convertStatisticsTargetToRole(target),
              },
            },
          },
        },
      },
    });
  }

  async getTotalActiveUsersCount({
    startDate,
    target = 'all',
    masterId,
  }: {
    masterId?: string;
    target: StatisticsTarget;
    startDate: Date;
  }): Promise<number> {
    const [count] = await this.prismaService.$queryRaw<
      {
        userscount: number;
      }[]
    >(Prisma.sql`
      select count(distinct b.user_id) as userscount
        from bets b
        join users u
          on u.id = b.user_id ${masterId ? Prisma.sql`and u.master_id = ${masterId}` : Prisma.empty} and b.created_at >= ${startDate}
        join (
          select
            user_id as id
          from
            user_roles ur
          where
            ur.role_id in (
              select id from roles r where r.name in (
                ${Prisma.join(convertStatisticsTargetToRole(target))}
              )
            )
          ) as filtered_users 
          on
            filtered_users.id = b.user_id
        `);
    return Number(count.userscount);
  }

  async getTotalActiveUsersToday({
    masterId,
    target = 'all',
    timezone,
  }: UserStatisticsOptions): Promise<number> {
    const now = DateTime.now()
      .setZone(timezone || 'UTC')
      .startOf('day');
    return this.getTotalActiveUsersCount({
      target,
      startDate: now.toJSDate(),
      masterId,
    });
  }

  async getTotalActiveUsersLastDays({
    masterId,
    numberOfDays,
    target = 'all',
    timezone = 'UTC',
  }: {
    masterId?: string;
    numberOfDays: number;
    target: StatisticsTarget;
    timezone?: string;
  }): Promise<number> {
    const now = DateTime.now()
      .setZone(timezone)
      .startOf('day')
      .minus({ days: numberOfDays });
    return this.getTotalActiveUsersCount({
      target,
      startDate: now.toJSDate(),
      masterId,
    });
  }

  async getUsersJoinedToday({
    target = 'all',
    timezone = 'UTC',
    masterId,
  }: {
    masterId?: string;
    target: StatisticsTarget;
    timezone?: string;
  }): Promise<number> {
    const now = DateTime.now().setZone(timezone).startOf('day');
    return this.prismaService.user.count({
      where: {
        masterId,
        userRoles: {
          some: {
            role: {
              name: {
                in: convertStatisticsTargetToRole(target),
              },
            },
          },
        },
        createdAt: {
          gte: now.toJSDate(),
        },
      },
    });
  }
}
