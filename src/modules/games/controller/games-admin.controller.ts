import { ErrorMessages } from '@common/enums/error-messages.enum';
import { NotFoundError } from '@common/error/not-found.error';
import { PagePaginationResponse } from '@common/types';
import { $filters } from '@meta/filters';
import { ApiFilterQueryType, Filterable } from '@meta/filters/decorator';
import { AdminGameDto } from '@modules/games/dto/game-admin.dto';
import { UpdateGameAdminDto } from '@modules/games/dto/update-game-admin.dto';
import { GamesService } from '@modules/games/service/games.service';
import { allOf, RequirePermissions } from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin Games')
@Controller('admin/games')
export class AdminGamesController {
  constructor(private readonly gamesService: GamesService) {}
  // region: Get
  @Get()
  @RequirePermissions('admin', allOf(Permissions.READ_GAMES))
  @ApiFilterQueryType('games')
  @Filterable('games')
  async getGames(): Promise<PagePaginationResponse<AdminGameDto>> {
    const search = $filters.text('search', {
      lowercase: true,
      minLen: 3,
      display: 'Search',
    });
    const category = $filters.dropdown('category', {
      display: 'category',
      options: [
        { value: 'slots', display: 'slots' },
        { value: 'live_casino', display: 'liveCasino' },
        { value: 'table_games', display: 'tableGames' },
        { value: 'web3', display: 'web3' },
        { value: 'Other', display: 'other' },
      ],
    });
    const provider = $filters.specific_dropdown('provider', {
      data_url: '/api/admin/games/providers',
      display: 'provider',
    });
    const available = $filters.dropdown('available', {
      type: 'dropdown',
      display: 'available',
      options: [
        { value: 'true', display: 'true' },
        { value: 'false', display: 'false' },
      ],
    });
    const disabled = $filters.boolean('disabled', {
      display: 'Disabled',
    });

    const { data, limit, page, total } = await this.gamesService.getGamesFiltered({
      search: search?.value,
      category: category?.value,
      provider: provider.value,
      available: available?.value ? available?.value === 'true' : undefined,
      disabled,
      limit: $filters.pagination.limit(),
      page: $filters.pagination.page(),
    });

    return {
      data: data.map(AdminGameDto.from),
      limit,
      page,
      total,
    };
  }

  @Get('/providers')
  @RequirePermissions('admin', allOf(Permissions.READ_GAMES))
  @ApiOperation({ summary: 'Get unique game providers' })
  async getProviders(): Promise<string[]> {
    return this.gamesService.getUniqueProviders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get game by id' })
  @ApiParam({ name: 'id', type: String, description: 'Game id' })
  @RequirePermissions('admin', allOf(Permissions.READ_GAMES))
  async getById(@Param('id') id: string): Promise<AdminGameDto> {
    const game = await this.gamesService.getById(id);

    if (!game) {
      throw new NotFoundError(ErrorMessages.NOT_FOUND, 'Game', id);
    }

    return AdminGameDto.from(game);
  }

  // endregion

  // region: Patch
  @Patch(':id')
  @RequirePermissions('admin', allOf(Permissions.EDIT_GAMES))
  async update(@Param('id') id: string, @Body() updateGameDto: UpdateGameAdminDto): Promise<AdminGameDto> {
    const game = await this.gamesService.update(id, updateGameDto);
    return AdminGameDto.from(game);
  }
  // endregion
}
