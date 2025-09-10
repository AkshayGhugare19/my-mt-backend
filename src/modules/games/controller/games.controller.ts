import { Body, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { GamesService } from '../service/games.service';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { Public } from '@common/decorators/public-route.decorator';
import { SyncGuard } from '@modules/authentication/core/guards/sync.guard';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CompressedResult } from '@modules/games/types';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateNewReleaseGameDto } from '../dto/update-new-release-game.dto';
import { UpdateGameVisibilityDto } from '../dto/update-game-visibility.dto';

@Controller('games')
@ApiTags('Games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('compressed')
  @Public()
  @SkipResponseFormatting()
  // @UseGuards(SyncGuard)
  async getCompressed(): Promise<CompressedResult> {
    return this.gamesService.getCompressed();
  }
  @Get('get-new-releases-games')
  @SkipResponseFormatting()
  @Public()
  async getNewReleasesGamesOnly() {
    return this.gamesService.getNewReleasesGamesOnly();
  }

  @Post('update-new-releases-game-by-gameid')
  @Public()
  async updateNewReleaseStatus(@Body() body: UpdateNewReleaseGameDto) {
    return this.gamesService.updateNewReleaseStatus(body.game_id, body.newRelease);
  }

  @Post('update-available-disable-game-by-gameid')
  @Public()
  async updateBlockAvailabeGame(@Body() body: UpdateGameVisibilityDto) {
    return this.gamesService.updateBlockAvailabeGame(body.game_id, body.available);
  }

  @Post('import-excel-update-new-releases-games')
  @Public()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.gamesService.importGamesFromExcel(file);
  }

}