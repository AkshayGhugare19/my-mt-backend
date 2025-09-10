import { Public } from '@common/decorators/public-route.decorator';
import { Controller, Get, Query, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { SlotegratorService } from '../service/slotegrator.service';

@Controller('slotegrator/test')
export class SlotegratorTestController {
  private readonly _logger = new Logger(SlotegratorTestController.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly slotegratorService: SlotegratorService,
  ) {}

  @Public()
  @Get('self-test')
  async selfTest(): Promise<void> {
    await this.slotegratorService.runSelfTest();
  }

  @Public()
  @Get('sportsbook')
  async testSportsBook(): Promise<void> {}

  @Public()
  @Get('sportsbook/self-test')
  async sportsBookSelfTest(@Query('s') sessionId: string): Promise<any> {
    return await this.slotegratorService.startSportsBookSelfTest(sessionId);
  }

  @Public()
  @Get('sportsbook/self-test/results')
  async sportsBookSelfTestResults(@Query('t') taskId: string): Promise<any> {
    return await this.slotegratorService.getSportsBookSelfTestResult(taskId);
  }

  @Public()
  @Get()
  async test(): Promise<void> {
    const games = await this.prismaService.slotegratorGame.findMany();

    const typeCounts = games.reduce(
      (acc, game) => {
        acc[game.type] = (acc[game.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const typeExamples = Object.keys(typeCounts).map((key) => {
      return {
        type: key,
        games: games
          .filter((game) => game.type === key)
          .slice(0, 5)
          .map((game) => game.name),
      };
    });

    this._logger.debug(typeCounts, typeExamples);

    const hasLobby = games.filter((game) => game.hasLobby);
    this._logger.debug(
      hasLobby.length,
      games.length - hasLobby.length,
      games.length,
    );

    const providerCounts = games.reduce(
      (acc, game) => {
        acc[game.provider] = (acc[game.provider] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    this._logger.debug(providerCounts);

    const missingImages = games.filter((game) => !game.image);
    this._logger.debug(missingImages.length, games.length);

    const gameWithLobby = hasLobby[Math.floor(Math.random() * hasLobby.length)];
    this._logger.debug(gameWithLobby);

    const gameWithoutLobby = games.find((game) => !game.hasLobby);
    this._logger.debug(gameWithoutLobby);
    if (!gameWithoutLobby) {
      return;
    }

    const session = await this.slotegratorService.createSession({
      slug: gameWithLobby.slug,
      userId: 'userid',
      userNickname: 'usernickname',
      demo: false,
    });
    this._logger.debug(session);
  }
}
