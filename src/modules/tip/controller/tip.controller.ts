import { UserContext } from '@common/decorators/user-context.decorator';
import { PagePaginationQueryDto } from '@common/query/page-pagination.query';
import {
  PagePaginationResponse,
  PagePaginationResponseSchema,
} from '@common/types';
import { JwtPayload } from '@modules/authentication/types';
import { TipSentDto, TipSentSchema } from '@modules/tip/dto/tip-sent.dto';
import { TipService } from '@modules/tip/service/tip.service';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Tips')
@Controller('tips')
export class TipController {
  constructor(private readonly tipService: TipService) {}

  // @Post()
  // @ApiOperation({ summary: 'Create a tip' })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Tip created successfully',
  //   type: TipSentDto,
  // })
  // @ApiResponse({ status: 400, description: 'Bad request' })
  // @ApiResponse({ status: 500, description: 'Internal server error' })
  // @ApiBody({
  //   type: CreateTipDto,
  // })
  // async createTip(
  //   @Body() createTipDto: CreateTipDto,
  //   @UserContext() { sub }: JwtPayload,
  // ): Promise<TipSentDto> {
  //   const createdTip = await this.tipService.createTipSync({
  //     senderId: sub,
  //     amount: createTipDto.amount,
  //     targetUsername: createTipDto.targetUsername,
  //   });
  //   return TipSentDto.from(createdTip);
  // }

  @Get('sent')
  @ApiOperation({ summary: 'Get tips sent' })
  @ApiResponse({
    status: 200,
    description: 'Tips fetched successfully',
    type: PagePaginationResponseSchema({ TipSentSchema }),
  })
  async getTips(
    @UserContext() { sub }: JwtPayload,
    @Query() query: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<TipSentDto>> {
    const data = await this.tipService.getAllTipsSent(sub, {
      pagination: {
        limit: query.limit,
        page: query.page,
      },
    });
    return {
      limit: data.limit,
      page: data.page,
      total: data.total,
      data: data.data.map((data) => TipSentDto.from(data)),
    };
  }
}
