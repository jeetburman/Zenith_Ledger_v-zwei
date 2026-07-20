import { Request, Response, NextFunction } from 'express';
import { getToken } from 'next-auth/jwt';
import { UnauthorizedError } from '../errors/AppError';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        name?: string;
        email?: string;
        number?: string;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = await getToken({
      req: {
        headers: req.headers,
        cookies: req.cookies,
      } as any,
      secret: process.env.NEXTAUTH_SECRET || '',
    });

    if (!token) {
      throw new UnauthorizedError('Please log in to continue');
    }

    req.user = {
      id: Number(token.id || token.sub),
      name: token.name as string | undefined,
      email: token.email as string | undefined,
      number: token.number as string | undefined,
    };

    next();
  } catch (error) {
    next(error);
  }
};