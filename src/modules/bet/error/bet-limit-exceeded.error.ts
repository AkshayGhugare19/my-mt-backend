export class BetLimitExceededError extends Error {
  constructor({ userId }: { userId?: string }) {
    super('Limit exceeded');
  }
}
