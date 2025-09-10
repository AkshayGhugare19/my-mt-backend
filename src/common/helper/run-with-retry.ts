export const runWithRetry = <T>(
  fn: () => Promise<T>,
  retryCount: number,
): Promise<T> => {
  let error: Error | null = null;
  for (let i = retryCount; i >= 0; i++) {
    try {
      return fn();
    } catch (e) {
      error = e;
    }
  }
  throw error;
};
