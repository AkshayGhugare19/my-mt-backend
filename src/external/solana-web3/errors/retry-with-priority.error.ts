export class RetryWithPriorityError extends Error {
  originalError: Error;
  constructor(originalError: Error) {
    super('Retry with priority');
    this.name = 'RetryWithPriorityError';
    this.originalError = originalError;
  }
}
