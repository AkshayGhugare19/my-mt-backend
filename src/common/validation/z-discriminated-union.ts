import { z } from 'zod';

export function zDiscriminatedUnion<
  Key extends string,
  Types extends z.ZodDiscriminatedUnionOption<Key>[],
>(key: Key, types: Types): z.ZodDiscriminatedUnion<string, Types> {
  const optionsMap = new Map<string, z.ZodDiscriminatedUnionOption<Key>>();
  for (const type of types) {
    const value = (type instanceof z.ZodEffects ? type.sourceType() : type)
      .shape[key];
    if (!(value instanceof z.ZodLiteral) || optionsMap.has(value.value)) {
      throw new Error('cannot contruct discriminated union');
    }
    optionsMap.set(value.value, type);
  }
  return new z.ZodDiscriminatedUnion({
    typeName: z.ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
    discriminator: key,
    options: types as any,
    optionsMap,
  });
}
