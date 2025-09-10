// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serializeObjectInRedisKey = (
  filters: Record<string, any>,
): string => {
  return Object.entries(filters)
    .sort(([key1, _value1], [key2, _value2]) => (key1 > key2 ? 1 : -1))
    .reduce((acc, [key, value]) => {
      if (value === undefined) return acc;
      if (Array.isArray(value)) {
        value.sort();
        return `${acc}${key}=${value.join(',')}|`;
      }
      if (typeof value === 'object' && value instanceof Date) {
        const date = value.toISOString().split('T')[0];
        return `${acc}${key}=${date}|`;
      }
      return `${acc}${key}=${value}|`;
    }, '');
};
