export function jsonSafeParse<T = any>(str: string): T | undefined {
  try {
    return JSON.parse(str);
  } catch (e) {
    return undefined;
  }
}
