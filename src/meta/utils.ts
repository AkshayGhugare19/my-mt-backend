class UnreachableError extends Error {
  constructor(message: string) {
    super(`Unreachable code reached. ${message}`);
    this.name = 'UnreachableError';
  }
}

export function assertUnreachable(message: string): never {
  throw new UnreachableError(message);
}
