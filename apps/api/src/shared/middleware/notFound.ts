import { Request, Response } from 'express';

// Catches any request that didn't match a registered route.
// Register this AFTER all routes but BEFORE errorHandler in app.ts.
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};