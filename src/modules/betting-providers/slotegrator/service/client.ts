import { GamesService } from '@modules/games/service/games.service';
import { Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';

export interface SlotegratorGame {
  uuid: string;
  name: string;
  image?: string;
  type: string;
  provider: string;
  technology: string;
  hasLobby: boolean;
  isMobileFullWindow: boolean;
  hasFreeSpins: boolean;
  hasTables: boolean;
  gameCategoryId: string;
}

export interface SlotegratorInitLobby {
  game_uuid: string;
  currency: string;
}

export interface SlotegratorInitLobbyResponse {
  lobby: {
    lobbyData: string;
    name: string;
    isOpen: string;
    openTime: string;
    closeTime: string;
    dealerName: string;
    dealerAvatar: string;
    technology: string;
  }[];
}

export interface SlotegratorInitGame {
  game_uuid: string;
  player_id: string;
  player_name: string;
  currency: string;
  session_id: string;
  return_url?: string;
  language?: string;
  email?: string;
  lobby_data?: string;
}

export interface SlotegratorInitGameResponse {
  url: string;
}

export interface SlotegratorInitDemoGame {
  game_uuid: string;
  return_url?: string;
  language?: string;
}

export interface SlotegratorSportsbook {
  id: number;
  uuid: string;
  name: string;
  providerId: number;
  type: string;
  externalId: string;
  technology: number;
}

export interface SlotegratorInitSportsbook {
  currency: string;
  player_id: string;
  player_name: string;
  session_id: string;
  sportsbook_uuid: string;
  language: string;
}

export interface SlotegratorInitSportsbookResponse {
  url: string;
  token: string;
}

interface PaginationMetadata {
  totalCount: number;
  pageCount: number;
  currentPage: number;
  perPage: number;
}

// encode nested objects and arrays
// {obj: [{ a: 1 }, {b: 2}]} => obj[0][a]=1&obj[1][b]=2
function encodeParams(obj: Record<string, any>, prefix: string = ''): string {
  const str: string[] = [];

  for (const p in obj) {
    const k = prefix ? `${prefix}[${p}]` : p;
    const v = obj[p];

    if (Array.isArray(v)) {
      str.push(...v.map((item, index) => encodeParams(item, `${k}[${index}]`)));
    } else if (v !== null && typeof v === 'object') {
      str.push(encodeParams(v, k));
    } else if (typeof v === 'boolean') {
      str.push(`${new URLSearchParams({ [k]: v ? '1' : '0' }).toString()}`);
    } else {
      str.push(`${new URLSearchParams({ [k]: v }).toString()}`);
    }
  }

  return str.join('&').replaceAll('&&', '&').replaceAll('%20', '+').replaceAll('(', '%28').replaceAll(')', '%29');
}

function sortObjectFieldsNested<T extends Record<string, any>>(obj: T): Record<string, any> {
  return Object.keys(obj)
    .sort()
    .reduce(
      (acc, key) => {
        const value = obj[key];
        if (value !== null && typeof value === 'object') {
          acc[key] = sortObjectFieldsNested(value);
        } else {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, any>,
    );
}

export function calculateWebhookSignature(
  headers: Record<string, string>,
  body: Record<string, any>,
  hashKey: string,
): string {
  const inputFields: Record<string, any> = {
    ...headers,
    ...body,
  };

  const sortedFields = sortObjectFieldsNested(inputFields);

  const fieldsString = encodeParams(sortedFields);
  console.log('fieldsString', fieldsString);

  const hmac = createHmac('sha1', hashKey).update(fieldsString);
  return hmac.digest('hex');
}

export function calculateRequestSignature(
  headers: Record<string, string>,
  body: Record<string, any>,
  hashKey: string,
): string {
  const inputFields: Record<string, any> = {
    ...headers,
    ...body,
  };

  const sortedFields = Object.keys(inputFields)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = inputFields[key];
        return acc;
      },
      {} as Record<string, any>,
    );
  const fieldsString = new URLSearchParams(sortedFields).toString();

  const hmac = createHmac('sha1', hashKey).update(fieldsString);
  return hmac.digest('hex');
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryLog<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  startDelay: number = 1000,
  retries: number = maxRetries,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    await delay(startDelay + (maxRetries - retries) * 1000);

    Logger.error(e);
    if (retries === 0) {
      throw e;
    }
    return await retryLog(fn, retries - 1, startDelay);
  }
}

type PaginationCursorAdvanceFn<TCursor, TResult> = (cursor: TCursor) => Promise<TResult[] | null>;

class PaginationCursor<T> implements AsyncIterable<T> {
  private page: number;
  private slice: T[] | null = [];
  private sliceIndex = 0;

  constructor(
    private readonly advanceFn: PaginationCursorAdvanceFn<number, T>,
    private readonly config: {
      firstPage?: number;
    } = {},
  ) {
    this.page = config.firstPage ?? 1;
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: async (): Promise<IteratorResult<T>> => {
        if (this.slice === null || this.sliceIndex >= this.slice.length) {
          const nextSlice = await this.advanceFn(this.page++);
          if (nextSlice === null) {
            return { done: true, value: undefined };
          }

          this.slice = nextSlice;
          this.sliceIndex = 0;
        }

        if (this.slice.length === 0) {
          return { done: true, value: undefined };
        }

        return { done: false, value: this.slice[this.sliceIndex++] };
      },
    };
  }

  async toArray(): Promise<T[]> {
    const result: T[] = [];
    for await (const item of this) {
      result.push(item);
    }

    return result;
  }
}

export class SlotegratorApiClient {
  private readonly _logger = new Logger(SlotegratorApiClient.name);

  constructor(
    private readonly merchantId: string,
    private readonly merchantKey: string,
    private readonly apiBaseUrl: string,
    private readonly gameService: GamesService,
  ) {}

  public async get<TResult extends Record<string, any>>(
    path: string,
    params: Record<string, any>,
    additionalHeaders: Record<string, string> = {},
  ): Promise<TResult> {
    const headers = {
      'X-Merchant-Id': this.merchantId,
      'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
      'X-Nonce': Math.random().toString(36).substring(7),
      ...additionalHeaders,
    };

    const signature = calculateRequestSignature(headers, params, this.merchantKey);

    const paramsString = new URLSearchParams(params).toString();

    this._logger.debug(`GET ${this.apiBaseUrl}/${path}?${paramsString}`, {
      headers: {
        ...headers,
        'X-Sign': signature,
      },
    });

    const response = await fetch(`${this.apiBaseUrl}/${path}?${paramsString}`, {
      method: 'GET',
      headers: {
        ...headers,
        'X-Sign': signature,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText} (${response.status}) ${await response.text()}`);
    }

    return response.json();
  }

  public async postJson<TResult extends Record<string, any>>(
    path: string,
    body: Record<string, any>,
    additionalHeaders: Record<string, string> = {},
  ): Promise<TResult> {
    const headers = {
      'X-Merchant-Id': this.merchantId,
      'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
      'X-Nonce': Math.random().toString(36).substring(7),
      ...additionalHeaders,
    };

    const signature = calculateRequestSignature(headers, body, this.merchantKey);

    this._logger.debug(`POST ${this.apiBaseUrl}/${path}`);
    this._logger.debug({ ...headers, 'X-Sign': signature });
    this._logger.debug(body);

    const response = await fetch(`${this.apiBaseUrl}/${path}`, {
      method: 'POST',
      headers: {
        ...headers,
        'X-Sign': signature,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText} (${response.status})\n${await response.text()}`);
    }

    return response.json();
  }

  public async post<TResult extends Record<string, any>>(
    path: string,
    body: Record<string, any>,
    additionalHeaders: Record<string, string> = {},
  ): Promise<TResult> {
    const headers = {
      'X-Merchant-Id': this.merchantId,
      'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
      'X-Nonce': Math.random().toString(36).substring(7),
      ...additionalHeaders,
    };

    const signature = calculateRequestSignature(headers, body, this.merchantKey);

    const formData = new FormData();
    for (const [key, value] of Object.entries(body)) {
      formData.append(key, value);
    }

    this._logger.debug({
      url: `${this.apiBaseUrl}/${path}`,
      method: 'POST',
      body: Object.fromEntries(formData.entries()),
      headers: {
        ...headers,
        'X-Sign': signature,
      },
    });

    const response = await fetch(`${this.apiBaseUrl}/${path}`, {
      method: 'POST',
      headers: {
        ...headers,
        'X-Sign': signature,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText} (${response.status})\n${await response.text()}`);
    }

    return response.json();
  }

  public games(config?: { pageLimit?: number }): PaginationCursor<SlotegratorGame> {
    return new PaginationCursor(async (page) => {
      if (config?.pageLimit !== undefined && page > config.pageLimit) {
        return null;
      }

      await delay(1000);
      Logger.debug({
        message: 'Fetching games page',
        page,
      });

      const result = await retryLog(async () => {
        return await this.get<{
          items?: Array<Record<string, any>>;
          _meta: PaginationMetadata;
        }>('games', {
          page,
        });
      });

      Logger.debug({
        message: 'Games fetched',
        page,
        result,
      });

      if (result._meta.currentPage !== page) {
        Logger.debug({
          message: 'Games fetched',
          page,
          result,
        });

        return null;
      }

      const items = result.items ?? [];

      return items.map((item) => {
        return {
          uuid: item.uuid,
          name: item.name,
          image: item.image,
          type: item.type,
          provider: item.provider,
          technology: item.technology,
          hasLobby: item.has_lobby === 1,
          isMobileFullWindow: item.is_mobile === 1,
          hasFreeSpins: item.has_freespins === 1,
          hasTables: item.has_tables === 1,
          gameCategoryId: this.gameService.getGameCategoryId(item.uuid, item.type, item.provider),
        };
      });
    });
  }

  public async initLobby(input: SlotegratorInitLobby): Promise<SlotegratorInitLobbyResponse> {
    return this.get('games/lobby', input);
  }

  public async initGame(input: SlotegratorInitGame): Promise<SlotegratorInitGameResponse> {
    return this.post('games/init', input);
  }

  public async initDemoGame(input: SlotegratorInitDemoGame): Promise<SlotegratorInitGameResponse> {
    return this.post('games/init-demo', input);
  }

  public async listSportsbooks(): Promise<SlotegratorSportsbook[]> {
    return this.get<SlotegratorSportsbook[]>('sportsbooks', {});
  }

  public async initSportsbook(input: SlotegratorInitSportsbook): Promise<SlotegratorInitSportsbookResponse> {
    return await this.postJson<any>('sportsbooks/init', input);
  }

  public async runSelfTest(): Promise<void> {
    try {
      const results = await this.post<{ success: boolean; log: string[] }>('self-validate', {});
      const log = results.log.join('\n');
      this._logger.debug({ success: results.success });
      await fs.promises.writeFile('/tmp/self-test.txt', log);
    } catch (e) {
      this._logger.error(e);
      throw e;
    }
  }

  public async startSportsBookSelfTest(sessionId: string): Promise<any> {
    try {
      return await this.postJson<any>('self-validate/run', {
        session_id: sessionId,
      });
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  public async getSportsBookSelfTestResults(taskId: string): Promise<any> {
    try {
      return await this.get<any>('self-validate/result/' + taskId, {});
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
}
