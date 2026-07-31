import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

// This middleware MUST be the last one registered in app.ts.
// Express identifies error handlers by their 4 arguments.
// Any route that calls next(error) lands here.
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Known, operational error — use its status and message
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Unknown error — log the full details server-side
  // but never expose internals to the client
  console.error('Unexpected error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
};