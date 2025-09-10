import { z } from 'zod';

export function zBooleanMapObject<Type extends z.ZodObject<z.ZodRawShape>>(
  types: Type,
): z.ZodSchema<Record<keyof Type['shape'], boolean>> {
  const keys = Object.keys(types.shape);

  const booleanMap = keys.reduce(
    (acc, key) => {
      acc[key as keyof Type['shape']] = z.boolean({ coerce: true });
      return acc;
    },
    {} as Record<keyof Type['shape'], z.ZodBoolean>,
  );

  return z.object(booleanMap);
}
