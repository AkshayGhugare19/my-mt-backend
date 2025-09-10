export class BadStatusError extends Error {
  constructor(status: string, betId: string) {
    super(`Bad status: ${status}, betId: ${betId}`);
  }
}
