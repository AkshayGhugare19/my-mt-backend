export function parseDuration(input: string | undefined): number | null {
  if (!input) return null;

  const match = input.match(/^(\d+)([smh])$/);

  if (!match) {
    return null;
  }

  const [, valueStr, unit] = match;
  const value = parseInt(valueStr, 10);

  if (isNaN(value)) {
    return null;
  }

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      return null;
  }
}
