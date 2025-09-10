import { RewardService } from '@modules/reward/service/reward.service';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateAdminRewardDto } from '@modules/reward/dto/create-admin-reward.dto';
import {
  allOf,
  anyOf,
  RequirePermissions,
} from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { UserContext } from '@common/decorators/user-context.decorator';
import { Filterable } from '@meta/filters/decorator';
import { JwtPayload } from '@modules/authentication/types';
import { AdminRewardDto } from '@modules/reward/dto/admin-reward.dto';
import {
  PagePaginationResponse,
  PagePaginationResponseSchema,
} from '@common/types';
import { $filters } from '@meta/filters';
import { usdtToPoints } from '@utils/usdt-to-points';
import {
  AllRewardsAdminDto,
  AllRewardsSchema,
} from '@modules/reward/dto/all-rewards.dto';

@ApiTags('Reward Admin')
@Controller('admin/rewards')
export class RewardAdminController {
  constructor(private readonly rewardService: RewardService) {}

  @Get()
  @RequirePermissions(
    'admin',
    anyOf(Permissions.READ_TIPS, Permissions.READ_OWN_VIP_TIPS),
  )
  @ApiResponse({
    type: PagePaginationResponseSchema({ AllRewardsSchema }),
    status: 200,
  })
  @Filterable('rewards')
  async getTips(
    @UserContext() { sub }: JwtPayload,
  ): Promise<PagePaginationResponse<AllRewardsAdminDto>> {
    const date = $filters.dateInterval('date');
    const amountUSDT = $filters.range('amountUSDT', {
      display: 'Amount (USDT)',
      min: 0,
    });

    const amount = amountUSDT.map(
      ([min, max]) =>
        [usdtToPoints(min), usdtToPoints(max)] as [number, number],
    );

    const status = $filters.select('status', {
      display: 'Status',
      options: [
        { value: 'completed', display: 'Completed' },
        { value: 'pending', display: 'Pending' },
        { value: 'failed', display: 'Expired' },
      ],
    });

    const description = $filters.text('description', {
      display: 'Description',
      minLen: 3,
      maxLen: 80,
    });

    const sender = $filters.text('sender', {
      display: 'Sender',
      minLen: 3,
    });

    const receiver = $filters.text('receiver', {
      display: 'Receiver',
      minLen: 3,
    });

    const [page, limit] = [
      $filters.pagination.page(),
      $filters.pagination.limit(),
    ];

    const data = await this.rewardService.getAllRewardsFiltered(sub, {
      filters: {
        amount,
        status: status.value,
        description: description.value,
        sender: sender.value,
        receiver: receiver.value,
        date: date.value,
      },
      pagination: { page, limit },
    });

    return {
      data: data.data.map(AllRewardsAdminDto.from),
      limit: data.limit,
      page: data.page,
      total: data.total,
    };
  }

  @Post('users/:userId')
  @RequirePermissions('admin', allOf(Permissions.CREATE_REWARDS))
  @ApiOperation({ summary: 'Create a reward for a user' })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user to create the reward for',
  })
  @ApiBody({ type: CreateAdminRewardDto })
  @ApiOkResponse({ type: AdminRewardDto })
  async createReward(
    @UserContext() ctx: JwtPayload,
    @Param('userId') userId: string,
    @Body() body: CreateAdminRewardDto,
  ): Promise<AdminRewardDto> {
    const reward = await this.rewardService.createReward(
      ctx.sub,
      userId,
      body.amount,
      body.description,
    );

    return AdminRewardDto.from(reward);
  }
}
