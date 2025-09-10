import { getFiltersContext } from './context';
import { z } from 'zod';
import { FilterValidationError } from './errors';

export class OptionalFilterValue<T> {
  protected constructor(public value: T | undefined) {}

  public static empty<T>(): OptionalFilterValue<T> {
    return new OptionalFilterValue<T>(undefined);
  }

  public static fromValue<T>(value: T): OptionalFilterValue<T> {
    return new OptionalFilterValue(value);
  }

  public map<U>(fn: (value: T) => U): U | undefined {
    if (!this.value) return undefined;
    return fn(this.value);
  }

  public or(value: T): T {
    return this.value ?? value;
  }
}

/// region: type-map-start
export interface BaseFilterConfiguration<T extends string> {
  type: T;
  display?: string;
}

export interface DateIntervalFilterConfiguration
  extends BaseFilterConfiguration<'dateInterval'> {}

export interface TextFilterConfiguration
  extends BaseFilterConfiguration<'text'> {
  trim?: boolean;
  lowercase?: boolean;
  minLen?: number;
  maxLen?: number;
}

export interface NumberFilterConfiguration
  extends BaseFilterConfiguration<'number'> {
  min?: number;
  max?: number;
}

export interface RangeFilterConfiguration
  extends BaseFilterConfiguration<'range'> {
  min?: number;
  max?: number;
}

export interface BooleanFilterConfiguration
  extends BaseFilterConfiguration<'boolean'> {
  default?: boolean;
}

export interface SelectFilterConfiguration<T extends string>
  extends BaseFilterConfiguration<'select' | 'dropdown'> {
  options: {
    value: T;
    display?: string;
  }[];
  multiple?: boolean;
}

export interface SpecificFilterConfiguration
  extends BaseFilterConfiguration<'specific_dropdown'> {
  data_url: string
}

export type SelectFilterOptionsValues<T> = T extends {
  options: { value: infer S }[];
}
  ? S
  : never;

export type FilterConfiguration =
  | DateIntervalFilterConfiguration
  | TextFilterConfiguration
  | NumberFilterConfiguration
  | RangeFilterConfiguration
  | BooleanFilterConfiguration
  | SelectFilterConfiguration<string>
  | SpecificFilterConfiguration

export type FilterConfigurationFor<T extends FilterConfiguration['type']> =
  Omit<FilterConfiguration & { type: T }, 'type'>;
/// region: type-map-end

function filterKey(
  type: FilterConfiguration['type'],
  name: string,
  suffix?: string,
): string {
  return `f_${type}_${name}${suffix ? '_' + suffix : ''}`;
}

function getRawValue(
  type: FilterConfiguration['type'],
  name: string,
  suffix?: string,
): string | string[] | undefined {
  const ctx = getFiltersContext();
  const key = filterKey(type, name, suffix);
  return ctx.rawData[key];
}

class FilterTreeBuilder {
  public static dateInterval(
    name: string,
    config?: FilterConfigurationFor<'dateInterval'>,
  ): OptionalFilterValue<[Date, Date]> {
    const rawStart = getRawValue('dateInterval', name, 'start');
    const rawEnd = getRawValue('dateInterval', name, 'end');

    if (!rawStart && !rawEnd) return OptionalFilterValue.empty();

    const result = z
      .object({
        start: z.date({ coerce: true }),
        end: z.date({ coerce: true }),
      })
      .transform((value) => ({
        start: new Date(value.start),
        end: new Date(value.end),
      }))
      .safeParse({
        start: rawStart,
        end: rawEnd,
      });

    if (!result.success || !result.data) {
      throw new FilterValidationError(
        `Invalid date interval values for '${name}': ${rawStart}, ${rawEnd}`,
      );
    }
    return OptionalFilterValue.fromValue([result.data.start, result.data.end]);
  }

  public static text(
    name: string,
    config?: FilterConfigurationFor<'text'>,
  ): OptionalFilterValue<string> {
    const rawValue = getRawValue('text', name);
    if (!rawValue) return OptionalFilterValue.empty();

    const result = z
      .string()
      .refine((value) => {
        if (
          typeof config?.minLen !== 'undefined' &&
          value.length < config.minLen
        ) {
          return false;
        }

        return !(
          typeof config?.maxLen !== 'undefined' && value.length > config.maxLen
        );
      })
      .safeParse(rawValue);
    if (!result.success || !result.data) {
      throw new FilterValidationError(
        `Invalid text value for '${name}': ${rawValue}`,
      );
    }

    let output = result.data;
    if (config?.trim !== false) output = output.trim();
    if (config?.lowercase) output = output.toLowerCase();

    return OptionalFilterValue.fromValue(output);
  }

  public static number(
    name: string,
    config?: FilterConfigurationFor<'number'>,
  ): OptionalFilterValue<number> {
    const rawValue = getRawValue('number', name);
    if (!rawValue) return OptionalFilterValue.empty();

    const result = z.coerce
      .number()
      .refine((value) => {
        if (typeof config?.min !== 'undefined' && value < config.min) {
          return false;
        }

        return !(typeof config?.max !== 'undefined' && value > config.max);
      })
      .safeParse(rawValue);

    if (!result.success || typeof result.data === 'undefined') {
      throw new FilterValidationError(
        `Invalid number value for '${name}': ${rawValue}`,
      );
    }

    return OptionalFilterValue.fromValue(result.data);
  }

  public static range(
    name: string,
    config?: FilterConfigurationFor<'range'>,
  ): OptionalFilterValue<[number, number]> {
    const rawStart = getRawValue('range', name, 'start');
    const rawEnd = getRawValue('range', name, 'end');

    if (!rawStart && !rawEnd) return OptionalFilterValue.empty();

    const result = z
      .object({
        start: z.coerce.number(),
        end: z.coerce.number(),
      })
      .refine((value) => {
        if (value.start > value.end) {
          return false;
        }

        if (typeof config?.min !== 'undefined' && value.start < config.min) {
          return false;
        }

        return !(typeof config?.max !== 'undefined' && value.end > config.max);
      })
      .safeParse({
        start: rawStart,
        end: rawEnd,
      });

    if (!result.success || !result.data) {
      throw new FilterValidationError(
        `Invalid range values for '${name}': ${rawStart}, ${rawEnd}`,
      );
    }
    return OptionalFilterValue.fromValue([result.data.start, result.data.end]);
  }

  public static boolean(
    name: string,
    config?: FilterConfigurationFor<'boolean'>,
  ): boolean | undefined {
    const rawValue = getRawValue('boolean', name);
    if (!rawValue) return config?.default;

    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;

    throw new FilterValidationError(
      `Invalid boolean value for '${name}': ${rawValue}`,
    );
  }

  public static select<
    T extends string,
    C extends Omit<SelectFilterConfiguration<T>, 'type'>,
    R = C extends { multiple: true }
      ? SelectFilterOptionsValues<C>[]
      : SelectFilterOptionsValues<C>,
  >(name: string, config: C): OptionalFilterValue<R> {
    const rawValue = getRawValue('select', name);
    if (!rawValue) return OptionalFilterValue.empty();

    const schema = config?.multiple
      ? z.array(z.string()).refine((value) => {
        return value.every((v) =>
          config?.options.some((option) => option.value === v),
        );
      })
      : z.string().refine((value) => {
        return config?.options.some((option) => option.value === value);
      });

    const result = schema.safeParse(rawValue);

    if (!result.success || !result.data) {
      throw new FilterValidationError(
        `Invalid select value for '${name}': ${rawValue}`,
      );
    }
    return OptionalFilterValue.fromValue(result.data as R);
  }

  public static dropdown<
    T extends string,
    C extends Omit<SelectFilterConfiguration<T>, 'type'>,
    R = C extends { multiple: true }
      ? SelectFilterOptionsValues<C>[]
      : SelectFilterOptionsValues<C>,
  >(name: string, config: C): OptionalFilterValue<R> {
    const rawValue = getRawValue('dropdown', name);
    if (!rawValue) return OptionalFilterValue.empty();

    const schema = config?.multiple
      ? z.array(z.string()).refine((value) => {
        return value.every((v) =>
          config?.options.some((option) => option.value === v),
        );
      })
      : z.string().refine((value) => {
        return config?.options.some((option) => option.value === value);
      });

    const result = schema.safeParse(rawValue);

    if (!result.success || !result.data) {
      throw new FilterValidationError(
        `Invalid select value for '${name}': ${rawValue}`,
      );
    }
    return OptionalFilterValue.fromValue(result.data as R);
  }

  public static specific_dropdown<
  C extends Omit<SpecificFilterConfiguration, 'type'>,
  R = C extends { multiple: true } ? string[] : string,
>(name: string, config: C): OptionalFilterValue<R> {
    const rawValue = getRawValue('specific_dropdown', name);
    if (!rawValue) return OptionalFilterValue.empty();

    return OptionalFilterValue.fromValue(rawValue as R);
  }

  public static pagination = {
    page(): number {
      const context = getFiltersContext();
      const rawValue = context.rawData.page;
      if (!rawValue) {
        return 1;
      }

      const result = z.coerce.number().safeParse(rawValue);
      if (!result.success || typeof result.data === 'undefined') {
        throw new FilterValidationError(`Invalid page value: ${rawValue}`);
      }

      return result.data;
    },
    limit(): number {
      const context = getFiltersContext();
      const rawValue = context.rawData.limit;
      if (!rawValue) {
        return 10;
      }

      const result = z.coerce.number().safeParse(rawValue);
      if (!result.success || typeof result.data === 'undefined') {
        throw new FilterValidationError(`Invalid limit value: ${rawValue}`);
      }

      return result.data;
    },
  };
}

export class $filters extends FilterTreeBuilder {}
