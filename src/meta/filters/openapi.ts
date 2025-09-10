import { z } from 'zod';

export function getZodTypeFromFilterType(params: {
  filterType: string;
  defaultValue?: string;
  minMax?: [string, string];
  selectOptions?: {
    value: string;
    display?: string;
  }[];
  selectMultiple?: boolean;
}): z.ZodType {
  const { filterType, defaultValue, minMax, selectOptions, selectMultiple } =
    params;
  switch (filterType) {
    case 'text':
      return addDefaultValueToZodType(z.string(), defaultValue).optional();
    case 'number':
      return addMinMaxToZodType(
        addDefaultValueToZodType(
          z.number({ coerce: true }),
          defaultValue,
        ) as z.ZodNumber,
        minMax?.[0],
        minMax?.[1],
      ).optional();
    case 'range':
      return z
        .array(
          addMinMaxToZodType(
            addDefaultValueToZodType(
              z.number({ coerce: true }),
              defaultValue,
            ) as z.ZodNumber,
            minMax?.[0],
            minMax?.[1],
          ),
        )
        .max(2)
        .min(1)
        .optional();
    case 'boolean':
      return addDefaultValueToZodType(
        z.boolean({ coerce: true }),
        defaultValue,
      );
    case 'dateInterval':
      return z
        .array(
          addMinMaxToZodType(
            addDefaultValueToZodType(
              z.date({ coerce: true }),
              defaultValue,
            ) as z.ZodDate,
            minMax?.[0],
            minMax?.[1],
          ),
        )
        .max(2)
        .min(1)
        .optional();
    case 'select':
      return convertToArray(
        addDefaultValueToZodType(
          z.enum(
            (selectOptions?.map((option) => option.value) ?? []) as [
              string,
              ...string[],
            ],
          ),
          defaultValue,
        ),
        selectMultiple ?? false,
      ).optional();
    case 'dropdown':
      return convertToArray(
        addDefaultValueToZodType(
          z.enum(
            (selectOptions?.map((option) => option.value) ?? []) as [
              string,
              ...string[],
            ],
          ),
          defaultValue,
        ),
        false,
      ).optional();
    case 'specific_dropdown':
      return convertToArray(
        addDefaultValueToZodType(
          z.enum(
            ((selectOptions ?? []).map((option) => option.value) as [string, ...string[]]) || ['']
          ),
          defaultValue,
        ),
        false,
      ).optional();
    default:
      throw new Error(`Unknown filter type: ${filterType}`);
  }
}

function convertToArray(type: z.ZodType, isMultiple: boolean): z.ZodType {
  return isMultiple ? type.array() : type;
}

function addDefaultValueToZodType(
  type: z.ZodType,
  defaultValue?: string,
): z.ZodType {
  return defaultValue !== undefined &&
    defaultValue !== null &&
    defaultValue !== 'undefined'
    ? type.default(defaultValue)
    : type;
}

function addMinMaxToZodType(
  type: z.ZodNumber | z.ZodDate,
  min?: string,
  max?: string,
): z.ZodType {
  const typeWithMin =
    min !== undefined && min !== 'undefined'
      ? typeof type._type === 'number'
        ? (type as z.ZodNumber).min(+min)
        : (type as z.ZodDate).min(new Date(min))
      : type;
  return max !== undefined && max !== 'undefined'
    ? typeof type._type === 'number'
      ? (typeWithMin as z.ZodNumber).max(+max)
      : (typeWithMin as z.ZodDate).max(new Date(max))
    : typeWithMin;
}
