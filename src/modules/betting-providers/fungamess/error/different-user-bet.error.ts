export class DifferentUserIdError extends Error {
  id: string;
  expectedUserId: string;
  actualUserId: string;

  constructor(
    message: string,
    {
      expectedUserId,
      actualUserId,
      id,
    }: { expectedUserId: string; actualUserId: string; id: string },
  ) {
    super(message);
    this.name = 'DuplicateBetPlacementError';
    this.message = message;
    this.id = id;
    this.expectedUserId = expectedUserId;
    this.actualUserId = actualUserId;
  }
}
