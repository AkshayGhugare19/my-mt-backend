export function generateSimplePassword(
  length = 6,
  alphabet = 'abcdefghijklmnopqrstuvwxyz',
): string {
  return Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join('');
}
