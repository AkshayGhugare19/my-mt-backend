import { SPORTS_BOOK_ID } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { ENV } from '@common/env';
import { NotFoundError } from '@common/error/not-found.error';
import { PagePaginationResponse } from '@common/types';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { createGameSlug } from '@modules/betting-providers/utils/format-slug';
import { CountryProvidersBlacklistService } from '@modules/country-providers/service/country-providers-blacklist.service';
import {
  DEMO_FLAG,
  FRONT_PAGE_FLAG,
  gamesConfiguration,
  GameType,
  GameTypes,
  getFavoriteGamesCategoryKey,
  getFavoriteGamesKey,
  IS_DESKTOP_FLAG,
  IS_MOBILE_FLAG,
} from '@modules/games/constants';
import { UpdateGameAdmin } from '@modules/games/dto/update-game-admin.dto';
import { DuplicateSlugError } from '@modules/games/error/duplicate-slug.error';
import { CompressedGame, CompressedProvider, CompressedResult, Game, GamesFilter, NewReleaseGame } from '@modules/games/types';
import { gameTypeFromString, gameTypeToString } from '@modules/games/utils';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SlotegratorGame } from '@prisma/client';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';
import { lastValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly httpService: HttpService,
    private readonly countryProvidersBlacklistService: CountryProvidersBlacklistService,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  // region: Selects
  public async getById(id: string): Promise<(SlotegratorGame & { gameCategory: string }) | null> {
    const game = await this.prismaService.slotegratorGame.findFirst({
      where: {
        uuid: id,
      },
      include: {
        gameCategory: true,
      },
    });

    if (!game) {
      return null;
    }

    return {
      ...game,
      gameCategory: game.gameCategory?.name ?? '',
    };
  }

  public async getGamesFiltered(filter: GamesFilter): Promise<PagePaginationResponse<SlotegratorGame>> {
    const { search, available, disabled, category, provider, page, limit } = filter;
    const filterPage = page ?? 1;
    const filterLimit = limit ?? 10;

    const where: Prisma.SlotegratorGameWhereInput = {
      disabled,
      available,
      gameCategory: category
        ? {
            name: {
              contains: category,
              mode: 'default',
            },
          }
        : undefined,
      OR: ((): Prisma.SlotegratorGameWhereInput['OR'] | undefined => {
        const or = [
          ...(search ? [{ name: { contains: search, mode: 'insensitive' } }] : []),
          ...(provider ? [{ provider: { contains: provider, mode: 'insensitive' } }] : []),
          ...(search ? [{ title: { contains: search, mode: 'insensitive' } }] : []),
          ...(search ? [{ slug: { contains: search, mode: 'insensitive' } }] : []),
        ].filter((el) => el !== undefined);
        return or.length > 0 ? (or as Prisma.SlotegratorGameWhereInput['OR']) : undefined;
      })(),
    };

    const total = await this.prismaService.slotegratorGame.count({
      where,
    });

    const data = await this.prismaService.slotegratorGame.findMany({
      where,
      skip: (filterPage - 1) * filterLimit,
      take: filterLimit,
      include: {
        gameCategory: true,
      },
    });

    return {
      total,
      page: filterPage,
      limit: filterLimit,
      data: data.map((game) => ({
        ...game,
        gameCategory: game.gameCategory?.name,
      })),
    };
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  public resolveGameType(id: string, type: string, provider: string, gameCategory?: {name: string, id: string}): GameType {
    const providerName = provider.toLowerCase();

    if (gamesConfiguration.web3Games.includes(id) || ['turbogames'].includes(providerName)) {
      return GameTypes.WEB3;
    }

    if (gamesConfiguration.liveCasino.includes(id)) {
      return GameTypes.LIVE;
    }

    if (gamesConfiguration.tableGames.includes(id) || ['netent', 'playngoasia', 'wazdan'].includes(providerName)) {
      if (gameCategory) {
        const category = this.getInternalCategoryOptions(gameCategory)
        if (category === GameTypes.SLOTS) {
          return category;
        }
      }
      return GameTypes.TABLE;
    }

    const isLiveInSlots = ['ezugi', 'evolution', 'evolution2'].includes(providerName);

    switch (type.toLowerCase().trim()) {
      case 'poker':
      case 'blackjack':
      case 'baccarat':
      case 'roulette': {
        if (gameCategory) {
          const category = this.getInternalCategoryOptions(gameCategory)
          if (category !== GameTypes.LIVE) {
            return category;
          }
        }
        return GameTypes.LIVE;
      }
      case 'crash':
        return GameTypes.SLOTS;
      case 'slots':
        if (gameCategory) {
          const category = this.getInternalCategoryOptions(gameCategory)
          if (category !== GameTypes.SLOTS) {
            return category;
          }
        }
        if (isLiveInSlots) {
          return GameTypes.LIVE;
        }

        return GameTypes.SLOTS;
      case 'table':
        return GameTypes.TABLE;
    }

    if (isLiveInSlots) {
      return GameTypes.LIVE;
    }

    if (gameCategory) {
      const category = this.getInternalCategoryOptions(gameCategory)
      if (category !== GameTypes.UNKNOWN) {
        return category;
      }
    }

    return GameTypes.SLOTS;
  }

  public getGameCategoryId(id: string, type: string, providerName: string): string {
    const gameType = this.resolveGameType(id, type, providerName);

    switch (gameType) {
      case GameTypes.SLOTS:
        return '1';
      case GameTypes.LIVE:
        return '2';
      case GameTypes.TABLE:
        return '3';
      case GameTypes.WEB3:
        return '4';
      default:
        return '6';
    }
  }

  private getInternalCategoryOptions(gameCategory: {name: string, id: string}): GameType {
    switch (gameCategory.name) {
      case 'slots': return GameTypes.SLOTS;
      case 'poker':
      case 'live_casino': return GameTypes.LIVE;
      case 'table_games': return GameTypes.TABLE;
      case 'web3': return GameTypes.WEB3;
      default: return GameTypes.UNKNOWN;
    }
  }

  private async getGames(): Promise<Game[]> {
    const initialGames = await this.prismaService.slotegratorGame.findMany({
      where: {
        available: true,
        disabled: false,
      },
      include: {
        gameCategory: true,
      }
    });

    return initialGames
      .filter((g) => g.image != null)
      .map((g) => ({
        id: g.uuid,
        providerName: g.provider,
        name: g.name,
        title: g.title!,
        image: g.image!,
        coverImage: g.image!,
        oldSlug: g.oldSlug!,
        slug: g.slug,
        isMobile: g.isMobileFullWindow,
        demo: true,
        type: this.resolveGameType(g.uuid, g.type, g.provider, g.gameCategory ?? undefined),
        category: g.type,
      }))
      .filter((g) => g.type !== GameTypes.UNKNOWN);
  }

  // endregion

  // region: Update

  public async update(id: string, updateData: UpdateGameAdmin): Promise<SlotegratorGame> {
    const game = await this.prismaService.slotegratorGame.findUnique({
      where: {
        uuid: id,
      },
    });

    if (!game) {
      throw new NotFoundError(ErrorMessages.NOT_FOUND, 'SlotegratorGames', id);
    }

    const updatePayload: Prisma.SlotegratorGameUpdateInput = {
      ...updateData,
    };

    if (updateData.slug && game.slug !== updateData.slug) {
      const duplicateSlug = await this.prismaService.slotegratorGame.findFirst({
        where: {
          slug: updateData.slug,
          uuid: {
            not: id,
          },
        },
      });

      if (duplicateSlug) {
        throw new DuplicateSlugError();
      }

      updatePayload.oldSlug = game.slug;
    }

    const result = await this.prismaService.slotegratorGame.update({
      where: { uuid: id },
      data: updatePayload,
    });

    if (result.slug !== game.slug || result.title !== game.title) {
      this.notifyChange({
        oldSlug: game.slug,
        newSlug: result.slug,
        oldTitle: game.title ?? undefined,
        newTitle: result.title ?? undefined,
      }).catch((err) => {
        this.logger.error({
          stack: err.stack,
          message: 'Failed to notify slug change',
          gameId: id,
          oldSlug: game.slug,
          newSlug: result.slug,
        });
      });
    }

    return result;
  }

  // endregion

  // region: Compress

  // eslint-disable-next-line sonarjs/cognitive-complexity
  public async getCompressed(): Promise<CompressedResult> {
    const imageRoot = this.configService.getOrThrow(ENV.GAME_IMAGE_ROOT);

    const games = await this.getGames();
    const allProviders = [...new Set(games.map((g) => g.providerName))];

    const allowedProviderNames = allProviders.filter((p) => {
      return !gamesConfiguration.disallowedProviders.includes(p.toLowerCase());
    });

    // ALL providers are allowed
    // const allowedProviderNames = allProviders;

    const web3ProviderNames = [...new Set(games.filter((g) => g.type === GameTypes.WEB3).map((g) => g.providerName))];

    const providerNames = [...new Set([...allowedProviderNames, ...web3ProviderNames])];
    const compressedProviders: CompressedProvider[] = providerNames;

    const compressedGames: CompressedGame[] = Array.from({ length: games.length }, () => [
      '',
      0,
      0,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);

    for (let gameIdx = 0; gameIdx < games.length; gameIdx++) {
      const game = games[gameIdx];

      const providerIdx = compressedProviders.findIndex((p) => p === game.providerName);
      if (providerIdx < 0) {
        continue;
      }

      if (game.type !== GameTypes.WEB3 && !allowedProviderNames.includes(game.providerName)) {
        continue;
      }

      const image = game.image.replace(imageRoot, '');
      const coverImage = game.coverImage.replace(imageRoot, '');

      if (image.endsWith('nothing.jpeg') || coverImage.endsWith('nothing.jpeg')) {
        continue;
      }

      const isFrontPage =
        gamesConfiguration.frontPageSelection[
          game.type as keyof typeof gamesConfiguration.frontPageSelection
        ]?.includes(game.id) ?? false;

      const demoFlag = game.demo ? DEMO_FLAG : 0;
      const frontPageFlag = isFrontPage ? FRONT_PAGE_FLAG : 0;

      let isMobile = 0;
      let isDesktop = 0;

      if (game.name.toLowerCase().includes('mobile')) {
        isMobile = IS_MOBILE_FLAG;
      } else if (!game.isMobile) {
        isDesktop = IS_DESKTOP_FLAG;
      } else {
        isMobile = IS_MOBILE_FLAG;
        isDesktop = IS_DESKTOP_FLAG;
      }

      const flags = frontPageFlag | demoFlag | isMobile | isDesktop | game.type;

      compressedGames[gameIdx] = [
        game.id,
        providerIdx,
        flags,
        game.name,
        game.title,
        game.slug,
        game.oldSlug,
        image,
        coverImage,
        game.category,
      ];
    }

    const firstGameIds = [
      ...gamesConfiguration.web3Games,
      ...gamesConfiguration.frontPageSelection[GameTypes.LIVE],
      ...gamesConfiguration.frontPageSelection[GameTypes.SLOTS],
      ...gamesConfiguration.frontPageSelection[GameTypes.TABLE],
    ].reverse();

    for (const gameId of firstGameIds) {
      const gameIdx = compressedGames.findIndex((g) => g[0] === gameId);
      if (gameIdx < 0) continue;

      const game = compressedGames[gameIdx];
      compressedGames.splice(gameIdx, 1);
      compressedGames.unshift(game);
    }
    const cpb = await this.countryProvidersBlacklistService.findAll();
    return {
      v: 1,
      p: compressedProviders,
      g: compressedGames.filter((g) => g[2 /* flags */] !== 0),
      sbi: (await this.redis.get(SPORTS_BOOK_ID)) ?? '',
      cpb: cpb.map((cp) => [
        cp.country,
        cp.providers.map((p) => compressedProviders.findIndex((provider) => provider === p)),
      ]),
    };
  }

  private async getNewReleaseGames(): Promise<NewReleaseGame[]> {
  const initialGames = await this.prismaService.slotegratorGame.findMany({
    where: {
      newRelease: true,
    },
    include: {
      gameCategory: true,
    },
  });

  return initialGames
    .filter((g) => g.image != null)
    .map((g) => ({
      id: g.uuid,
      providerName: g.provider,
      name: g.name,
      title: g.title!,
      image: g.image!,
      coverImage: g.image!,
      oldSlug: g.oldSlug!,
      slug: g.slug,
      isMobile: g.isMobileFullWindow,
      demo: true,
      type: this.resolveGameType(g.uuid, g.type, g.provider, g.gameCategory ?? undefined),
      category: g.type,
      newRelease: g.newRelease, // ✅ Prisma camelCase field
    }))
    .filter((g) => g.type !== GameTypes.UNKNOWN);
}

public async getNewReleasesGamesOnly() {
  const imageRoot = this.configService.getOrThrow(ENV.GAME_IMAGE_ROOT);
  const games = await this.getNewReleaseGames();

  return games.map((game) => ({
    ...game,
    image: game.image.replace(imageRoot, ''),
    coverImage: game.coverImage.replace(imageRoot, ''),
  }));
}



async updateNewReleaseStatus(game_id: string, newRelease: boolean) {
  this.logger.log(`Updating newRelease for game_id>>: ${game_id} to ${newRelease}`);
  return this.prismaService.slotegratorGame.update({
    where: { uuid: game_id },       // Prisma field name
    data: { newRelease },           // Prisma field name
  });
}


async updateBlockAvailabeGame(game_id: string, available: boolean) {
  this.logger.log(`updateBlockAvailabeGame game_id: ${game_id} -> available: ${available}`);
  return this.prismaService.slotegratorGame.update({
    where: { uuid: game_id },   // 👈 use "uuid" here, not game_id
    data: { available },
  });
}


async importGamesFromExcel(file: Express.Multer.File) {
  this.logger.log(`Processing Excel file: ${file.originalname}`);

  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  const results = [];
  const newGames = [];

  function parseExcelDate(dateStr: any): Date | null {
    if (!dateStr) return null;
    if (typeof dateStr === 'number') {
      const parsed = XLSX.SSF.parse_date_code(dateStr);
      if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    }
    if (typeof dateStr === 'string') {
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        const [day, month, year] = parts.map((v) => parseInt(v, 10));
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(Date.UTC(year, month - 1, day));
        }
      }
    }
    return null;
  }

  for (const row of rows) {
    const gameId = String(row['Game ID']).trim();
    const name = String(row['Name']).trim();
    const provider = String(row['Provider']).trim();
    const releaseDate = parseExcelDate(row['Release Date']);

    const existing = await this.prismaService.slotegratorGame.findUnique({
      where: { uuid: gameId },
    });

    if (existing) {
      // ✅ Update only newRelease + newReleaseDate
      await this.prismaService.slotegratorGame.update({
        where: { uuid: gameId },
        data: {
          newRelease: true,
          newReleaseDate: releaseDate,
        },
      });
      this.logger.log(`✅ Updated game: ${gameId}`);
      results.push({ gameId, status: 'updated', releaseDate: releaseDate?.toISOString() });
    } else {
      // 🆕 Prepare new entry with slug + image
      const slug = createGameSlug(provider, name);
      //for staging
      // const imageUrl = `https://stage.gis-static.com/games/${provider}/${gameId}.jpg`;
      // for production
      const imageUrl = `https://gis-static.com/games/${provider}/${gameId}.jpg`;

      newGames.push({
        uuid: gameId,
        name,
        provider,
        type: row['Type'] || 'slots',
        technology: row['Technology'] || 'HTML5',
        isMobileFullWindow: row['Is Mobile'] === 'Yes',
        hasLobby: row['Has lobby'] === 'Yes',
        hasFreeSpins: row['Has Freespins'] === 'Yes',
        hasTables: ['blackjack', 'roulette', 'poker', 'table'].includes(
          String(row['Type']).toLowerCase()
        ),
        available: row['Active'] === 'Yes',
        title: name,
        slug,
        image: imageUrl, // ✅ image set only on insert
        newRelease: true,
        newReleaseDate: releaseDate,
      });
      results.push({
        gameId,
        status: 'to_create',
        releaseDate: releaseDate?.toISOString(),
        image: imageUrl,
      });
    }
  }

  // ✅ Bulk insert all new games at once
  if (newGames.length > 0) {
    await this.prismaService.slotegratorGame.createMany({
      data: newGames,
      skipDuplicates: true,
    });
    this.logger.log(`🆕 Inserted ${newGames.length} new games`);
  }

  return { total: results.length, results };
}

  private async notifyChange(payload: {
    oldSlug: string;
    newSlug: string;
    oldTitle?: string;
    newTitle?: string;
  }): Promise<void> {
    const url = `${this.configService.getOrThrow(ENV.WEB_APP_BASE_URL)}/api/games`;
    const basicAuth = this.configService.get(ENV.CLIENT_BASIC_AUTH);
    const request = this.httpService.patch(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuth ? `Basic ${basicAuth}` : undefined,
        'x-api-key': this.configService.getOrThrow(ENV.SYNC_TOKEN),
      },
    });

    const response = await lastValueFrom(request);

    console.log(response.data);
  }

  public async updateFavoriteGamesFromBet(userId: string, gameId: string): Promise<void> {
    const game = await this.prismaService.slotegratorGame.findFirst({
      where: {
        uuid: gameId,
        available: true,
        disabled: false,
      },
    });

    if (!game) return;

    const type = this.resolveGameType(gameId, game.type, game.provider);
    if (type === GameTypes.UNKNOWN) return;

    await Promise.all([
      this.redis.hincrby(getFavoriteGamesKey(userId), gameId.toString(), 1),
      this.redis.hincrby(getFavoriteGamesCategoryKey(userId), gameTypeToString(type), 1),
    ]);
  }

  // region: Favorite Games Selects

  public async getFavoriteGamesIds(userId: string): Promise<string[]> {
    const gameIds = await this.redis.hgetall(getFavoriteGamesKey(userId));

    return Object.entries(gameIds)
      .map(([id, count]) => [id, parseInt(count, 10)] as const)
      .sort(([, countA], [, countB]) => countB - countA)
      .filter(([, count]) => count > 0)
      .map(([id]) => id);
  }

  public async getFavoriteGameCategory(userId: string): Promise<GameType> {
    const categories = await this.redis.hgetall(getFavoriteGamesCategoryKey(userId));

    const orderedCategories = Object.entries(categories)
      .map(([category, count]) => [category, parseInt(count, 10)] as const)
      .sort(([, countA], [, countB]) => countB - countA)
      .filter(([, count]) => count > 0)
      .map(([category]) => category);

    return orderedCategories.length > 0 ? gameTypeFromString(orderedCategories[0]) : GameTypes.UNKNOWN;
  }
  // endregion

  public async getUniqueProviders(): Promise<string[]> {
    const providers = await this.prismaService.slotegratorGame.findMany({
      select: { provider: true },
      distinct: ['provider'],
    });

    return providers
      .map((p) => p.provider)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }
}