export class BadRequestFormatError extends Error {
  id: string;

  constructor(message: string, { id }: { id: string }) {
    super(message);
    this.name = 'BadRequestFormatError';
    this.message = message;
    this.id = id;
  }
}
