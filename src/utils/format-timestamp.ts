export function formatTimestamp(timestamp: number): number {
  return timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
}
