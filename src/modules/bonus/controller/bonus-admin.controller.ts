import { ConfigService } from '@nestjs/config';
import { UserContext } from '@common/decorators/user-context.decorator';
import { PagePaginationQueryDto } from '@common/query/page-pagination.query';
import { PagePaginationResponse } from '@common/types';
import { JwtPayload } from '@modules/authentication/types';
import { BonusTriggerConfigTypes } from '@modules/bonus/enum';
import { ProducerEventHandler } from '@modules/bonus/handlers/producer-event-handler';
import { FilterUserBonusesQuery } from '@modules/bonus/query/filter-user-bonuses.query';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { BonusProgressionService } from '@modules/bonus/service/bonus-progression.service';
import { BonusTriggerService } from '@modules/bonus/service/bonus-trigger.service';
import { BonusService } from '@modules/bonus/service/bonus.service';
import {
  RequirePermissions,
  allOf,
  anyOf,
} from '@modules/permission/decorator/require-permissions.decorator';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotImplementedException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ENV } from '@common/env';
import { BonusDto } from '@modules/bonus/dtos/bonus-dto';
import { BonusTriggerDto } from '@modules/bonus/dtos/bonus-trigger.dto';
import { BonusProgressionDto } from '@modules/bonus/dtos/bonus-progression.dto';
import { CreateBonusDto } from '@modules/bonus/dtos/create-bonus.dto';
import { AdminManualTriggerDto } from '@modules/bonus/dtos/admin-manual-trigger.dto';
import { DisableBonusDto } from '@modules/bonus/dtos/disable-bonus.dto';
import { BonusJobProducer } from '@modules/bonus/job/producer/bonus-job.producer';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { PermissionService } from '@modules/permission/service/permission.service';

@ApiBearerAuth()
@ApiTags('Admin Bonuses')
@Controller('admin/bonuses')
export class BonusAdminController {
  constructor(
    private readonly bonusService: BonusService,
    private readonly bonusTriggerService: BonusTriggerService,
    private readonly bonusProgressService: BonusProgressionService,
    private readonly producerEventHandler: ProducerEventHandler,
    private readonly asyncLogService: AsyncLogService,
    private readonly configService: ConfigService,
    private readonly cronProducer: BonusJobProducer,
    private readonly permissionService: PermissionService,
  ) {}

  @Get()
  @RequirePermissions('admin', allOf(Permissions.READ_BONUS))
  async list(
    @Query() paginationQuery: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<BonusDto>> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    const data = await this.bonusService.findPaginated(paginationQuery, true);
    return {
      data: data.data.map((bonus) => BonusDto.from(bonus)),
      limit: data.limit,
      page: data.page,
      total: data.total,
    };
  }

  @Get('triggers')
  @RequirePermissions('admin', allOf(Permissions.READ_BONUS))
  async getTriggers(
    @Query() paginationQuery: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<BonusTriggerDto>> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    const triggers =
      await this.bonusTriggerService.getAllTriggers(paginationQuery);

    return {
      data: triggers.data.map((trigger) => ({
        ...BonusTriggerDto.create(trigger),
      })),
      limit: triggers.limit,
      page: triggers.page,
      total: triggers.total,
    };
  }

  @Get('/users/progress')
  @RequirePermissions('admin', allOf(Permissions.READ_USER_BONUS))
  async getAllBonusProgress(
    @Query() paginationQuery: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<BonusProgressionDto>> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    const data = await this.bonusProgressService.getAll(paginationQuery);
    return {
      data: data.data.map((progression) =>
        BonusProgressionDto.from(progression),
      ),
      limit: data.limit,
      page: data.page,
      total: data.total,
    };
  }

  @Get('users/:userId')
  @RequirePermissions(
    'admin',
    anyOf(Permissions.READ_USER_BONUS, Permissions.READ_OWN_USER_BONUS),
  )
  async listAvailableForUser(
    @UserContext() { sub }: JwtPayload,
    @Param('userId') userId: string,
    @Query() paginationQuery: FilterUserBonusesQuery,
  ): Promise<PagePaginationResponse<BonusDto>> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    const data = await this.bonusService.findAvailableForUser(
      sub,
      userId,
      paginationQuery,
    );
    return {
      data: data.data.map((bonus) => BonusDto.from(bonus)),
      limit: data.limit,
      page: data.page,
      total: data.total,
    };
  }

  @Get('users/:userId/progress')
  @RequirePermissions(
    'admin',
    anyOf(Permissions.READ_USER_BONUS, Permissions.READ_OWN_USER_BONUS),
  )
  async listUserBonusProgression(
    @UserContext() { sub }: JwtPayload,
    @Param('userId') userId: string,
    @Query() paginationQuery: FilterUserBonusesQuery,
  ): Promise<PagePaginationResponse<BonusProgressionDto>> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    const permissions = await this.permissionService.getUserPermissions(sub);
    const data = await this.bonusProgressService.getAll(
      paginationQuery,
      {
        userId,
        user: {
          masterId: permissions.includes(Permissions.READ_OWN_USER_BONUS)
            ? sub
            : undefined,
        },
      },
      true,
    );

    return {
      data: data.data.map((progression) =>
        BonusProgressionDto.from(progression),
      ),
      limit: data.limit,
      page: data.page,
      total: data.total,
    };
  }

  @Post()
  @RequirePermissions('admin', allOf(Permissions.CREATE_BONUS))
  async create(
    @UserContext() { sub }: JwtPayload,
    @Body() createBonus: CreateBonusDto,
  ): Promise<BonusDto> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    const created = await this.bonusService.create(sub, createBonus);
    return BonusDto.from(created);
  }

  @Post('users')
  @RequirePermissions('admin', allOf(Permissions.EDIT_USER_BONUS))
  async createUserBonus(
    @Body() { userIds, bonusId, amount }: AdminManualTriggerDto,
  ): Promise<{ userId: string; status: boolean }[]> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    return await Promise.all(
      userIds.map(async (userId) => {
        return await this.producerEventHandler
          .handleEvent({
            event: {
              amount,
              bonusId,
              userId,
            },
            type: BonusTriggerConfigTypes.ADMIN_MANUAL,
            userId,
          })
          .then(() => ({
            status: true,
            userId,
          }))
          .catch((e) => {
            Logger.error({
              message: e.message,
              stack: e.stack,
            });
            return {
              status: false,
              userId,
            };
          });
      }),
    );
  }

  @Patch('/:bonusId/status')
  @RequirePermissions('admin', allOf(Permissions.EDIT_BONUS))
  disableBonus(
    @Param('bonusId') bonusId: string,
    @Body() { disabled }: DisableBonusDto,
  ): Promise<void> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    return this.bonusService.disable(bonusId, disabled);
  }

  @Patch('/:bonusId/users/:userId/status')
  @RequirePermissions('admin', allOf(Permissions.EDIT_USER_BONUS))
  disableUserBonus(
    @Param('bonusId') bonusId: string,
    @Param('userId') userId: string,
    @Body() { disabled }: DisableBonusDto,
  ): Promise<void> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    return this.bonusService.disableForUser(bonusId, userId, disabled);
  }

  @Patch('/logging')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('admin', allOf(Permissions.EDIT_BONUS))
  async changeLogging(@Body() { value }: { value: boolean }): Promise<void> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    await this.asyncLogService.toggleLogging(value);
  }

  @Patch('/triggers/cron')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('admin', allOf(Permissions.EDIT_BONUS))
  async triggerCron(): Promise<void> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      throw new NotImplementedException();
    }
    await this.cronProducer.handleCron();
  }
}
