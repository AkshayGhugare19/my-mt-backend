import { UserContext } from '@common/decorators/user-context.decorator';
import { Roles } from '@modules/role/enum/role.enum';
import { PagePaginationResponse } from '@common/types';
import { JwtPayload } from '@modules/authentication/types';
import { CreateMasterTokenSettlementRequestDto } from '@modules/token-settlement/dto/create-master-token-settlement-request.dto';
import { MasterVipTokenSettlementDto } from '@modules/token-settlement/dto/master-vip-token-settlement.dto';
import { TokenSettlementAdminDto } from '@modules/token-settlement/dto/token-settlement-admin.dto';
import { UpdateMasterTokenSettlementProofDto } from '@modules/token-settlement/dto/update-master-token-settlement-proof.dto';
import { UserTokenSettlementFilterQuery } from '@modules/token-settlement/query/user-token-settlement-filter.query';
import { TokenSettlementService } from '@modules/token-settlement/service/token-settlement.service';
import {
  MasterTokenSettlementRequestWithEmails,
  TokenSettlementRequestWithEmails,
} from '@modules/token-settlement/types';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { decimalToNumber } from '@utils/decimal-do-number';
import { CreateMasterVipTokenSettlementRequest } from '../dto/create-master-vip-token-settlement-request.dto';
import {
  RequirePermissions,
  allOf,
  anyOf,
} from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { PermissionService } from '@modules/permission/service/permission.service';
import { UserService } from '@modules/user/services/user.service';
import { Decimal } from '@prisma/client/runtime/library';
import { ApiFilterQueryType, UseFilters } from '@meta/filters/decorator';
import { $filters } from '@meta/filters';
import { usdtToPoints } from '@utils/usdt-to-points';
import { OptionalFilterValue } from '@meta/filters/tree';

const REPORTS_SETTLEMENTS_FILTERS = 'reports.settlements';

@Controller('admin/token/settlements')
export class TokenSettlementRequestAdminController {
  private readonly logger = new Logger(
    TokenSettlementRequestAdminController.name,
  );

  constructor(
    private readonly tokenSettlementService: TokenSettlementService,
    private readonly permissionService: PermissionService,
    private readonly userService: UserService,
  ) {}

  // !CHECK - https://trello.com/c/zyyBR2L0
  @Get('hold')
  @RequirePermissions('admin', allOf(Permissions.READ_SETTLEMENTS_VIPS))
  async getHoldValue(@UserContext() { sub }: JwtPayload): Promise<number> {
    return this.tokenSettlementService.getSettlementRequestAmount(sub);
  }

  private async settlementFilters(): Promise<{
    userSearch: OptionalFilterValue<string>;
    amountUSDT: OptionalFilterValue<[number, number]>;
    date: OptionalFilterValue<[Date, Date]>;
  }> {
    const userSearch = $filters.text('userSearch', {
      display: 'User search',
      lowercase: true,
      minLen: 3,
    });

    const date = $filters.dateInterval('date');

    const amountUSDT = $filters.range('amountUSDT', {
      display: 'Amount (USDT)',
      min: 0,
    });

    return {
      userSearch,
      amountUSDT,
      date,
    };
  }

  @Get('/vips')
  @RequirePermissions('admin', allOf(Permissions.READ_SETTLEMENTS_VIPS))
  @ApiFilterQueryType(REPORTS_SETTLEMENTS_FILTERS)
  @UseFilters(REPORTS_SETTLEMENTS_FILTERS)
  async getAll(
    @Query() query: UserTokenSettlementFilterQuery,
    @UserContext() { sub }: JwtPayload,
  ): Promise<PagePaginationResponse<MasterVipTokenSettlementDto>> {
    const { userSearch, amountUSDT, date } = await this.settlementFilters();

    const amount = amountUSDT.map(
      ([min, max]) =>
        [usdtToPoints(min), usdtToPoints(max)] as [number, number],
    );

    return await this.tokenSettlementService.getOwnVipSettlementRequests(
      sub,
      {
        createdAt: date.value
          ? {
              gte: date.value?.[0],
              lte: date.value?.[1],
            }
          : undefined,
        amount: amount
          ? {
              gte: amount?.[0],
              lte: amount?.[1],
            }
          : undefined,
        user: {
          OR: userSearch.value
            ? [
                {
                  email: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  nickname: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  wallet: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  id: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
                {
                  playerTag: {
                    contains: userSearch.value,
                    mode: 'insensitive',
                  },
                },
              ]
            : undefined,
        },
      },
      query,
      $filters.pagination.page(),
      $filters.pagination.limit(),
    );
  }

  @Get('/masters')
  @RequirePermissions(
    'admin',
    anyOf(
      Permissions.READ_SETTLEMENTS_SMM,
      Permissions.READ_SETTLEMENTS_SMM_OWN,
    ),
  )
  @ApiFilterQueryType(REPORTS_SETTLEMENTS_FILTERS)
  @UseFilters(REPORTS_SETTLEMENTS_FILTERS)
  async getAllMasterTokenSettlements(
    @UserContext() { sub }: JwtPayload,
    @Query() query: UserTokenSettlementFilterQuery,
  ): Promise<PagePaginationResponse<TokenSettlementAdminDto>> {
    let requests: PagePaginationResponse<MasterTokenSettlementRequestWithEmails>;
    const permissions = await this.permissionService.getUserPermissions(sub);
    const { userSearch, amountUSDT, date } = await this.settlementFilters();

    const amount = amountUSDT.map(
      ([min, max]) =>
        [usdtToPoints(min), usdtToPoints(max)] as [number, number],
    );

    if (permissions.includes(Permissions.READ_SETTLEMENTS_SMM)) {
      requests = await this.tokenSettlementService.getAllMasterTokenSettlements(
        sub,
        {
          createdAt: date.value
            ? {
                gte: date.value?.[0],
                lte: date.value?.[1],
              }
            : undefined,
          amount: amount
            ? {
                gte: amount?.[0],
                lte: amount?.[1],
              }
            : undefined,
          user: {
            OR: userSearch.value
              ? [
                  {
                    email: {
                      contains: userSearch.value,
                      mode: 'insensitive',
                    },
                  },
                  {
                    nickname: {
                      contains: userSearch.value,
                      mode: 'insensitive',
                    },
                  },
                  {
                    wallet: {
                      contains: userSearch.value,
                      mode: 'insensitive',
                    },
                  },
                  {
                    id: {
                      contains: userSearch.value,
                      mode: 'insensitive',
                    },
                  },
                  {
                    playerTag: {
                      contains: userSearch.value,
                      mode: 'insensitive',
                    },
                  },
                ]
              : undefined,
          },
        },
        query,
        $filters.pagination.page(),
        $filters.pagination.limit(),
      );
    } else {
      requests = await this.tokenSettlementService.getMasterSettlementRequests(
        sub,
        {
          createdAt: date.value
            ? {
                gte: date.value?.[0],
                lte: date.value?.[1],
              }
            : undefined,
          amount: amount
            ? {
                gte: amount?.[0],
                lte: amount?.[1],
              }
            : undefined,
          user: {
            OR: userSearch.value
              ? [
                  {
                    email: {
                      contains: userSearch.value,
                      mode: 'insensitive',
                    },
                  },
                  {
                    nickname: {
                      contains: userSearch.value,
                      mode: 'insensitive',
                    },
                  },
                  {
                    wallet: {
                      contains: userSearch.value,
                      mode: 'insensitive',
                    },
                  },
                  {
                    id: {
                      contains: userSearch.value,
                      mode: 'insensitive',
                    },
                  },
                  {
                    playerTag: {
                      contains: userSearch.value,
                      mode: 'insensitive',
                    },
                  },
                ]
              : undefined,
          },
        },
        query,
        $filters.pagination.page(),
        $filters.pagination.limit(),
      );
    }

    return {
      data: requests.data.map((request) =>
        TokenSettlementAdminDto.from(request),
      ),
      limit: requests.limit,
      page: requests.page,
      total: requests.total,
    };
  }

  // !CHECK - https://trello.com/c/R0xF81Lr
  @Post('/vips')
  @RequirePermissions('admin', allOf(Permissions.CREATE_SETTLEMENTS_VIPS))
  async createVipTokenSettlement(
    @Body() createTokenSettlementRequest: CreateMasterVipTokenSettlementRequest,
  ): Promise<MasterVipTokenSettlementDto> {
    if (!createTokenSettlementRequest.targetId) {
      throw new BadRequestException('Target id is required');
    }

    const createdRequest =
      await this.tokenSettlementService.lockAndCreateMasterVipTokenSettlement({
        targetId: createTokenSettlementRequest.targetId,
        amount: createTokenSettlementRequest.amount
          ? new Decimal(createTokenSettlementRequest.amount)
          : undefined,
      });
    const targetUser = await this.userService.getUserBookieStakeOrThrow(
      createTokenSettlementRequest.targetId,
    );

    return new MasterVipTokenSettlementDto({
      ...createdRequest,
      settleAmount: decimalToNumber(createdRequest.settleAmount),
      amount: decimalToNumber(createdRequest.amount),
      userBookieStake: decimalToNumber(targetUser.userBookieStake),
    });
  }

  @Post('/masters')
  @RequirePermissions(
    'admin',
    anyOf(
      Permissions.CREATE_SETTLEMENTS_SMM,
      Permissions.CREATE_SETTLEMENTS_SMM_OWN,
    ),
  )
  async create(
    @UserContext() { sub }: JwtPayload,
    @Body() createTokenSettlementRequest: CreateMasterTokenSettlementRequestDto,
  ): Promise<TokenSettlementAdminDto> {
    const { targetId, request } = await this.createMasterTokenSettlement(
      sub,
      createTokenSettlementRequest,
    );

    const targetUser = await this.userService.getUserBookieStakeOrThrow(
      targetId!,
    );

    return TokenSettlementAdminDto.from({
      ...request,
      flexibleBookieStake: decimalToNumber(targetUser.flexibleBookieStake),
      predefinedBookieStake: decimalToNumber(targetUser.predefinedBookieStake),
    });
  }

  private async createMasterTokenSettlement(
    sub: string,
    createTokenSettlementRequest: CreateMasterTokenSettlementRequestDto,
  ): Promise<{ request: TokenSettlementRequestWithEmails; targetId: string }> {
    const permissions = await this.permissionService.getUserPermissions(sub);
    const createTargetSettlement = permissions.includes(
      Permissions.CREATE_SETTLEMENTS_SMM,
    );
    if (createTargetSettlement) {
      if (!createTokenSettlementRequest.targetId) {
        throw new BadRequestException('Target id is required');
      }
      const request =
        await this.tokenSettlementService.lockAndCreateSuperMasterTokenSettlement(
          {
            initiatorRole: createTargetSettlement
              ? Roles.SUPER_MASTER
              : Roles.MASTER,
            targetId: createTokenSettlementRequest.targetId,
            amount: createTokenSettlementRequest.amount
              ? new Decimal(createTokenSettlementRequest.amount)
              : undefined,
          },
        );
      return { targetId: createTokenSettlementRequest.targetId, request };
    }
    const createOwnSettlement = permissions.includes(
      Permissions.CREATE_SETTLEMENTS_SMM_OWN,
    );

    if (createOwnSettlement) {
      const request =
        await this.tokenSettlementService.lockAndCreateMasterTokenSettlement({
          amount: createTokenSettlementRequest.amount
            ? new Decimal(createTokenSettlementRequest.amount)
            : undefined,
          targetId: sub,
        });
      return { targetId: sub, request };
    }
    this.logger.error(
      `User ${sub} has no permissions to create token settlements`,
    );
    throw new ForbiddenException();
  }

  @Patch('/:id/vips/accept')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_SETTLEMENTS_VIPS))
  async acceptRequest(
    @Param('id') id: string,
    @UserContext() { sub }: JwtPayload,
  ): Promise<MasterVipTokenSettlementDto> {
    const request =
      await this.tokenSettlementService.lockAndApproveTokenSettlement({
        masterId: sub,
        requestId: id,
      });
    const targetUser = await this.userService.getUserBookieStakeOrThrow(
      request.targetId,
    );
    return new MasterVipTokenSettlementDto({
      amount: decimalToNumber(request.amount),
      createdAt: request.createdAt,
      id: request.id,
      masterEmail: request.masterEmail,
      masterNickname: request.masterNickname,
      status: request.status,
      targetEmail: request.targetEmail,
      settleAmount: decimalToNumber(request.settleAmount),
      targetNickname: request.targetNickname,
      updatedAt: request.updatedAt,
      userBookieStake: decimalToNumber(targetUser.userBookieStake),
    });
  }

  @Patch('/:id/vips/reject')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_SETTLEMENTS_VIPS))
  async rejectRequest(
    @Param('id') id: string,
    @UserContext() { sub }: JwtPayload,
  ): Promise<MasterVipTokenSettlementDto> {
    const request =
      await this.tokenSettlementService.lockAndRejectTokenSettlement({
        masterId: sub,
        requestId: id,
      });
    const targetUser = await this.userService.getUserBookieStakeOrThrow(
      request.targetId,
    );
    return new MasterVipTokenSettlementDto({
      amount: decimalToNumber(request.amount),
      createdAt: request.createdAt,
      id: request.id,
      masterEmail: request.masterEmail,
      masterNickname: request.masterNickname,
      status: request.status,
      settleAmount: decimalToNumber(request.settleAmount),
      targetEmail: request.targetEmail,
      targetNickname: request.targetNickname,
      updatedAt: request.updatedAt,
      userBookieStake: decimalToNumber(targetUser.userBookieStake),
    });
  }

  @Patch('/:id/masters/proof')
  @RequirePermissions(
    'admin',
    anyOf(
      Permissions.EDIT_SETTLEMENTS_SMM,
      Permissions.EDIT_SETTLEMENTS_SMM_OWN,
    ),
  )
  async updateProof(
    @Param('id') id: string,
    @UserContext() { sub }: JwtPayload,
    @Body() { proof }: UpdateMasterTokenSettlementProofDto,
  ): Promise<TokenSettlementAdminDto> {
    const request =
      await this.tokenSettlementService.lockAndUpdateTokenSettlementProof({
        proof,
        requestId: id,
        uploaderId: sub,
      });
    const targetUser = await this.userService.getUserBookieStakeOrThrow(
      request.targetId,
    );
    return TokenSettlementAdminDto.from({
      ...request,
      flexibleBookieStake: decimalToNumber(targetUser.flexibleBookieStake),
      predefinedBookieStake: decimalToNumber(targetUser.predefinedBookieStake),
    });
  }

  @Patch('/:id/masters/status')
  @RequirePermissions(
    'admin',
    anyOf(
      Permissions.EDIT_SETTLEMENTS_SMM,
      Permissions.EDIT_SETTLEMENTS_SMM_OWN,
    ),
  )
  async updateStatus(
    @Param('id') id: string,
    @UserContext() { sub }: JwtPayload,
  ): Promise<TokenSettlementAdminDto> {
    const request =
      await this.tokenSettlementService.lockAndCloseTokenSettlementStatus({
        requestId: id,
        accepterId: sub,
      });
    const targetUser = await this.userService.getUserBookieStakeOrThrow(
      request.targetId,
    );
    return TokenSettlementAdminDto.from({
      ...request,
      flexibleBookieStake: decimalToNumber(targetUser.flexibleBookieStake),
      predefinedBookieStake: decimalToNumber(targetUser.predefinedBookieStake),
    });
  }
}
