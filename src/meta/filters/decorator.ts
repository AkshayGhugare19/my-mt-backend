import { applyDecorators, ParamData, PipeTransform } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { FiltersContext, runWithFiltersContext } from './context';
import {
  FilterConfiguration,
  FilterDefinition,
  filters,
} from '../generated/filters';
import { ApiQuery } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from '@common/helper/create-zod-dto';
import { getZodTypeFromFilterType } from '@meta/filters/openapi';

interface ArgsMetadataItem {
  index: number;
  data?: ParamData;
  pipes: PipeTransform[];
}

type ArgsMetadata = Record<string, ArgsMetadataItem>;

function argsMetadataKey(paramType: RouteParamtypes, index: number): string {
  return `${paramType}:${index}`;
}

function shiftArgsMetadata(
  existing: ArgsMetadata,
  paramType: RouteParamtypes,
  append: ArgsMetadataItem,
): ArgsMetadata {
  const newMetadata: ArgsMetadata = {};

  for (const key in existing) {
    const [paramType] = key.split(':');

    const item = existing[key]!;
    item.index += 1;

    newMetadata[
      argsMetadataKey(paramType as unknown as RouteParamtypes, item.index)
    ] = item;
  }

  newMetadata[argsMetadataKey(paramType, append.index)] = append;

  return newMetadata;
}

export const ApiFilterQueryType = (
  name: keyof typeof filters,
  extendWith?: z.ZodObject<any>,
): MethodDecorator => {
  const f = filters[name as keyof typeof filters] as FilterDefinition;
  const tempType = z.object(
    Object.entries(filters[name].properties)
      .map(([key, schema]: [string, FilterConfiguration]) => [key, schema])
      .reduce((acc, [key, schema]: [string, FilterConfiguration]) => {
        if (!f?.properties?.[key]) {
          return acc;
        }
        if (f?.properties?.[key]?.type === 'dateInterval') {
          return {
            ...acc,
            [`f_${f.properties[key].type}_${key}_end`]: z
              .date({
                coerce: true,
              })
              .optional(),
            [`f_${f.properties[key].type}_${key}_start`]: z
              .date({
                coerce: true,
              })
              .optional(),
          };
        }
        if (f?.properties?.[key]?.type === 'range') {
          return {
            ...acc,
            [`f_${f.properties[key].type}_${key}_end`]: z
              .number({
                coerce: true,
              })
              .optional(),
            [`f_${f.properties[key].type}_${key}_start`]: z
              .number({
                coerce: true,
              })
              .optional(),
          };
        }

        return {
          ...acc,
          [`f_${f.properties[key].type}_${key}`]: getZodTypeFromFilterType({
            filterType: f.properties[key].type,
            defaultValue: (schema as any).default as string | undefined,
            minMax: (schema as any).minMax as [string, string] | undefined,
            selectOptions: (schema as any).options as
              | { value: string; display?: string }[]
              | undefined,
            selectMultiple: (schema as any).selectMultiple as
              | boolean
              | undefined,
          }),
        };
      }, {}),
  );

  return applyDecorators(
    ApiQuery({
      type: createZodDto(tempType.extend(extendWith?.shape ?? {})),
    }),
  );
};

export function Filterable(
  name: string,
  skipFilterContext: boolean = false,
): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    // wrap the method with the filter logic
    const originalMethod = descriptor.value;
    if (!originalMethod || typeof originalMethod !== 'function') {
      return descriptor;
    }

    const argsMetadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      target.constructor,
      propertyKey,
    );

    const newArgsMetadata = shiftArgsMetadata(
      argsMetadata,
      RouteParamtypes.QUERY,
      {
        index: 0,
        data: undefined,
        pipes: [],
      },
    );

    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      newArgsMetadata,
      target.constructor,
      propertyKey,
    );

    descriptor.value = async function (
      query: Record<string, string | string[] | undefined>,
      ...args: any[]
    ) {
      const context: FiltersContext = {
        rawData: query as Record<string, string | string[] | undefined>,
      };
      if (!skipFilterContext) {
        return runWithFiltersContext(context, () =>
          originalMethod.apply(this, args),
        );
      }
      return originalMethod.apply(this, args);
    } as unknown as any;

    return descriptor;
  };
}

export function UseFilters(
  name: string,
  extendWith?: z.ZodObject<any>,
): MethodDecorator {
  return applyDecorators(
    Filterable(name),
    ApiFilterQueryType(name as keyof typeof filters, extendWith),
  );
}
