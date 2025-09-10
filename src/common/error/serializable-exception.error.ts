export interface ISerializableException {
  getMessage(): string;
  getErrors(): Record<string, unknown> | undefined;

  defaultResponseCode?: number;
}

export abstract class SerializableException
  extends Error
  implements ISerializableException {
  defaultResponseCode?: number | undefined;
  errors?: Record<string, unknown> | undefined;

  constructor(params: { message?: string, errors?: Record<string, unknown> }) {
    const { message } = params;
    super(message);
    this.errors = params.errors;
  }

  getMessage(): string {
    return this.message;
  }

  getErrors(): Record<string, unknown> | undefined {
    return this.errors;
  }
}

export function isSerializableException(
  exception: ISerializableException | Error,
): exception is ISerializableException {
  return (
    typeof exception === 'object' &&
    typeof (exception as ISerializableException).getMessage === 'function' &&
    typeof (exception as ISerializableException).getErrors === 'function'
  );
}
