export function sortObjectDeep(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  const keys = Object.keys(obj).sort();

  keys.forEach((key) => {
    const value = obj[key];
    if (value instanceof Object || value instanceof Array) {
      result[key] = sortObjectDeep(value);
    } else {
      result[key] = value;
    }
  });
  return result;
}

export function joinObjectToStringRecursive(
  obj: Record<string, any>,
  separator = '',
): string {
  let result = '';

  for (const key in obj) {
    // eslint-disable-next-line no-prototype-builtins
    if (!obj.hasOwnProperty(key)) {
      continue;
    }

    const value = obj[key];
    if (value instanceof Object || value instanceof Array) {
      result += joinObjectToStringRecursive(value, separator) + separator;
    } else {
      result += value + separator;
    }
  }
  return result.substring(0, result.length - separator.length);
}
