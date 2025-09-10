import { DB } from '@infrastructure/database/kysely/generated';
import { Injectable, Logger, OnApplicationShutdown, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { DefaultArgs, JsPromise, Types } from '@prisma/client/runtime/library';
import {
  CompiledQuery,
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  Simplify,
} from 'kysely';
import { TipBonusRepository } from './types';
import { ClsService, ClsServiceManager } from 'nestjs-cls';
import {
  PRISMA_TRANSACTION_MANAGER_HOOKS_KEY,
  PRISMA_TRANSACTION_MANAGER_KEY,
} from '@infrastructure/database/prisma/constants';

export type PrismaTransactionManager = Omit<
  PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
  '$on' | '$connect' | '$disconnect' | '$use' | '$transaction' | '$extends'
> & {
  addOnCommitHook?: (hook: { name: string; fn: () => Promise<void> }) => void;
  addOnRollbackHook?: (hook: { name: string; fn: () => Promise<void> }) => void;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  private db: Kysely<DB>;
  private _tipBonus: TipBonusRepository;

  constructor(private readonly clsService: ClsService) {
    super();
    this.db = new Kysely<DB>({
      dialect: {
        createAdapter: (): PostgresAdapter => new PostgresAdapter(),
        createDriver: (): DummyDriver => new DummyDriver(),
        createQueryCompiler: (): PostgresQueryCompiler => new PostgresQueryCompiler(),
        createIntrospector: (db): PostgresIntrospector => new PostgresIntrospector(db),
      },
    });
    const extendedClient = this.$extends({
      query: {
        reward: {
          $allOperations: async ({ operation, args, query }) => {
            const cls = ClsServiceManager.getClsService();
            const transactionManager = cls.getProxy<PrismaTransactionManager>(PRISMA_TRANSACTION_MANAGER_KEY);

            if ((args as { where: any }).where) {
              (args as { where: any }).where.type = 'tip';
            }

            if (transactionManager) {
              const txQuery = transactionManager.reward[operation] as typeof query;

              return txQuery(args);
            }

            return query(args);
          },
        },
      },
    });
    this._tipBonus = extendedClient.reward;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  get tipBonus(): TipBonusRepository {
    return this._tipBonus;
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.$disconnect();
    } catch (error) {
      Logger.error(error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.onApplicationShutdown();
  }

  createQueryBuilder(): Kysely<DB> {
    return this.db;
  }

  runQuery<T>(query: CompiledQuery<T>): Promise<Simplify<T>[]> {
    // Not unsafe. As long as the query is not user-generated, it's safe.
    return this.$queryRawUnsafe(query.sql, ...query.parameters);
  }

  // Override the $transaction method for array of promises
  override $transaction<P extends Prisma.PrismaPromise<any>[] | any>(
    arg: P | ((prisma: PrismaTransactionManager) => JsPromise<P>),
    options?: {
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): P extends Array<Prisma.PrismaPromise<any>>
    ? ReturnType<typeof this.startArrayTransaction<P>>
    : ReturnType<typeof this.startFunctionTransaction<P>> {
    if (typeof arg === 'function') {
      // @ts-expect-error
      return this.startFunctionTransaction(arg as (prisma: PrismaTransactionManager) => JsPromise<P>, options);
    } else if (Array.isArray(arg)) {
      // @ts-expect-error
      return this.startArrayTransaction(arg, options);
    }
    throw new Error('Invalid argument');
  }

  private startArrayTransaction<P extends Prisma.PrismaPromise<any>[]>(
    arg: [...P],
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): JsPromise<Types.Utils.UnwrapTuple<P>> {
    return super.$transaction(arg, options);
  }

  // Override the $transaction method for function
  private startFunctionTransaction<R>(
    fn: (prisma: PrismaTransactionManager) => JsPromise<R>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): JsPromise<R> {
    // eslint-disable-next-line sonarjs/cognitive-complexity
    return this.clsService.runWith(this.clsService.get(), async () => {
      return super.$transaction(async (transactionManager) => {
        this.clsService.setProxy(PRISMA_TRANSACTION_MANAGER_KEY, transactionManager);
        this.clsService.setProxy(PRISMA_TRANSACTION_MANAGER_HOOKS_KEY, {
          onCommit: [],
          onRollback: [],
        });
        (transactionManager as PrismaTransactionManager).addOnCommitHook = (hook: {
          name: string;
          fn: () => Promise<void>;
        }): void => {
          const cls = this.clsService.getProxy<{
            onCommit: { name: string; fn:() => Promise<void> }[];
            onRollback: { name: string; fn: () => Promise<void> }[];
              }>(PRISMA_TRANSACTION_MANAGER_HOOKS_KEY);
          if (!cls) {
            throw new Error('Cannot add onCommit hook outside of a transaction. PrismaTransactionManager not found');
          }
          cls.onCommit.push(hook);
        };
        (transactionManager as PrismaTransactionManager).addOnRollbackHook = (hook: {
          name: string;
          fn: () => Promise<void>;
        }): void => {
          const cls = this.clsService.getProxy<{
            onCommit: { name: string; fn:() => Promise<void> }[];
            onRollback: { name: string; fn: () => Promise<void> }[];
              }>(PRISMA_TRANSACTION_MANAGER_HOOKS_KEY);
          if (!cls) {
            throw new Error('Cannot add onRollback hook outside of a transaction. PrismaTransactionManager not found');
          }
          cls.onRollback.push(hook);
        };

        try {
          const result = await fn(transactionManager as PrismaTransactionManager);

          // Execute commit hooks
          const cls = this.clsService.getProxy<{
            onCommit: { name: string; fn:() => Promise<void> }[];
            onRollback: { name: string; fn: () => Promise<void> }[];
              } | undefined>(PRISMA_TRANSACTION_MANAGER_HOOKS_KEY);

          if (cls && cls.onCommit?.length > 0) {
            await Promise.allSettled(
              cls.onCommit.map(async (hook) => {
                try {
                  await hook.fn();
                } catch (error) {
                  Logger.error(
                    { error: `Commit hook execution failed: ${error.message} ${hook.name}`, errorStack: error.stack },
                    'PrismaService',
                  );
                }
              }),
            );
          }

          return result;
        } catch (error) {
          // Execute rollback hooks
          const cls = this.clsService.getProxy<{
            onCommit: { name: string; fn:() => Promise<void> }[];
            onRollback: { name: string; fn: () => Promise<void> }[];
              } | undefined>(PRISMA_TRANSACTION_MANAGER_HOOKS_KEY);

          if (cls && cls.onRollback?.length > 0) {
            await Promise.allSettled(
              cls.onRollback.map(async (hook) => {
                try {
                  await hook.fn();
                } catch (hookError) {
                  Logger.error(
                    {
                      error: `Rollback hook execution failed: ${hookError.message} ${hook.name}`,
                      errorStack: hookError.stack,
                    },
                    'PrismaService',
                  );
                }
              }),
            );
          }

          throw error;
        }
      }, options);
    });
  }
}
