export const camelCaseToSnakeCase = (str: string): string => {
  const snakeCased = str
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .toUpperCase();
  if (snakeCased.startsWith('_')) {
    return snakeCased.slice(1);
  }
  return snakeCased;
};
