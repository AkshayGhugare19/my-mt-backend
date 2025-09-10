export type ErrorParser = (error: Error) => {
  body: unknown;
  statusCode: number;
};

const errorParsers: Record<string, ErrorParser> = {};

export function registerErrorParser(
  errorName: string,
  parser: ErrorParser,
): void {
  if (errorParsers[errorName]) {
    throw new Error('Error parser already exists: ' + errorName);
  }
  errorParsers[errorName] = parser;
}

export function getErrorParser(errorName: string): ErrorParser | undefined {
  return errorParsers[errorName];
}
