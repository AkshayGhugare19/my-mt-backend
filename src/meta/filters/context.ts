import { AsyncLocalStorage } from 'node:async_hooks';
import { FiltersContextNotFoundError } from './errors';

export interface FiltersContext {
  rawData: Record<string, string | string[] | undefined>;
}

const filtersContextStorage = new AsyncLocalStorage<FiltersContext>();

export function getFiltersContext(): FiltersContext {
  const store = filtersContextStorage.getStore();
  if (!store) {
    throw new FiltersContextNotFoundError();
  }

  return store;
}

export async function runWithFiltersContext<TArgs extends any[], TReturn>(
  context: FiltersContext,
  callback: (...args: TArgs) => TReturn,
  ...args: TArgs
): Promise<Awaited<TReturn>> {
  return await filtersContextStorage.run(context, () => callback(...args));
}
