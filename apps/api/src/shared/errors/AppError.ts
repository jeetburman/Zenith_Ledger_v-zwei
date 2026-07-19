// Base error class for all expected errors in the app.
// Carries an HTTP status code so the error handler
// knows what to send back to the client.
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;

    // isOperational = true means this is an expected,
    // handled error — wrong password, not found, etc.
    // false would mean an actual bug we didn't anticipate.
    this.isOperational = true;

    // Required to make instanceof checks work correctly
    // when extending built-in classes in TypeScript
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// These are the only error types we'll throw across the app.
// Import whichever one fits the situation.

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}