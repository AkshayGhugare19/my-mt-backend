export class DuplicateBetPlacementError extends Error {
  id: string;
  type: 'eventId' | 'betId' | 'transactionId';
  constructor(
    message: string,
    id: string,
    type: 'eventId' | 'betId' | 'transactionId',
  ) {
    super(message);
    this.name = 'DuplicateBetPlacementError';
    this.message = message;
    this.id = id;
    this.type = type;
  }
}
