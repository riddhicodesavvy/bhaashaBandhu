/**
 * Application domain error class for structured operational and validation failures.
 */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Asserts condition or throws an AppError with given HTTP status code and message.
 */
export function ensure(
  value: unknown,
  status: number,
  code: string,
  message: string
): asserts value {
  if (!value) {
    throw new AppError(status, code, message);
  }
}
