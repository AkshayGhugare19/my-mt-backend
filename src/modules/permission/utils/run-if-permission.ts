export function runIfPermission<T>(
  hasPermission: boolean,
  callback: () => T,
): T | undefined {
  if (hasPermission) {
    return callback();
  }
  return undefined;
}
