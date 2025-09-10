import { RewardService } from '@modules/reward/service/reward.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  PagePaginationResponse,
  PagePaginationResponseSchema,
} from '@common/types';
import { UserContext } from '@common/decorators/user-context.decorator';
import { JwtPayload } from '@modules/authentication/types';
import { PagePaginationQueryDto } from '@common/query/page-pagination.query';
import {
  AllRewardsReceivedDto,
  AllRewardsReceivedSchema,
} from '@modules/reward/dto/all-rewards.dto';

@ApiTags('Reward')
@Controller('rewards')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get(':type/received')
  @ApiOperation({ summary: 'Get rewards received' })
  @ApiResponse({
    status: 200,
    description: 'Rewards fetched successfully',
    type: PagePaginationResponseSchema({ AllRewardsReceivedSchema }),
  })
  async getTipsReceived(
    @UserContext() { sub }: JwtPayload,
    @Param('type') type: string,
    @Query() query: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<AllRewardsReceivedDto>> {
    const data = await this.rewardService.getAllRewardsReceived(sub, {
      filters: {
        type,
      },
      pagination: {
        limit: query.limit,
        page: query.page,
      },
    });
    return {
      limit: data.limit,
      page: data.page,
      total: data.total,
      data: data.data.map((data) => AllRewardsReceivedDto.from(data)),
    };
  }
}
