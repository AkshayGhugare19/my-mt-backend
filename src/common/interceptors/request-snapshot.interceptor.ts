import { AllExceptionFilter } from '@common/error-filters/catch-all.filter';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import cuid2 from '@paralleldrive/cuid2';
import { Request } from 'express';
import { existsSync } from 'fs';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { catchError, map, Observable } from 'rxjs';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class RequestSnapshotInterceptor implements NestInterceptor {
  private static recordSnapshot = false;
  private readonly exceptionFilter: AllExceptionFilter;

  private static readonly snapshotMap = new Map<string, any>();

  constructor(
    private readonly reflector: Reflector,
    private readonly i18nService: I18nService,
  ) {
    this.exceptionFilter = new AllExceptionFilter(
      {
        httpAdapter: {
          reply(_: unknown, body: unknown, __: number) {
            return body;
          },
        },
      } as HttpAdapterHost,
      this.i18nService,
    );
  }

  static async getSnapshotById(id: string): Promise<any> {
    // check if the file exists
    const filePath = `.snapshots/${id}.json`;
    const exists = existsSync(filePath);
    if (!exists) {
      return null;
    }
    return await readFile(filePath, 'utf8');
  }

  static async setRecordSnapshot(
    recordSnapshot: boolean,
  ): Promise<string | void> {
    if (this.recordSnapshot === true && recordSnapshot === false) {
      // get all the keys and the values and save them in a file
      const allSnapshots = Array.from(this.snapshotMap.entries()).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: Array.from(value.values()) }),
        {},
      );
      const snapshotId = cuid2.createId();
      const snapshotDir = '.snapshots';
      if (!existsSync(snapshotDir)) {
        await mkdir(snapshotDir);
      }
      await writeFile(
        `.snapshots/${snapshotId}.json`,
        JSON.stringify(allSnapshots, null, 2),
      );
      this.snapshotMap.clear();
      this.recordSnapshot = recordSnapshot;
      return snapshotId;
    } else {
      this.recordSnapshot = recordSnapshot;
    }
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    if (!RequestSnapshotInterceptor.recordSnapshot) {
      return next.handle();
    }

    const key = this.reflector.get(
      'snapshot-requests-key',
      context.getHandler(),
    );

    if (!key) {
      return next.handle();
    }

    const request: Request = context.switchToHttp().getRequest();

    const id = cuid2.createId();
    const snapshot = {
      request: {
        id,
        url: request.url,
        method: request.method,
        body: request.body,
      },
    };

    let mapEntry = RequestSnapshotInterceptor.snapshotMap.get(key);

    if (!mapEntry) {
      RequestSnapshotInterceptor.snapshotMap.set(key, new Map());
      mapEntry = RequestSnapshotInterceptor.snapshotMap.get(key);
    }

    mapEntry.set(id, snapshot);

    return next.handle().pipe(
      map((data) => {
        mapEntry.get(id).response = data;
        return data;
      }),
      catchError((error) => {
        mapEntry.get(id).response = this.exceptionFilter.catch(error, context);
        throw error;
      }),
    );
  }
}
