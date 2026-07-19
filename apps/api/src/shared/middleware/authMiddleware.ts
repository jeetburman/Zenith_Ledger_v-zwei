import { Request, Response, NextFunction } from 'express';
import { getToken } from 'next-auth/jwt';
import { UnauthorizedError } from '../errors/AppError';

// Extend Express's Request type to include our user data.
// This means after this middleware runs, any route handler
// can access req.user without TypeScript complaining.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email?: string;
        number?: string;
      };
    }
  }
}

// This middleware runs before any protected route handler.
// It reads the NextAuth session token from the request cookie,
// verifies it using the same NEXTAUTH_SECRET both apps share,
// and attaches the user info to req.user.
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // getToken() reads and verifies the NextAuth JWT cookie.
    // It needs the raw Node.js request object — Express's req
    // is compatible so we cast it.
    const token = await getToken({
      req: req as any,
      secret: process.env.NEXTAUTH_SECRET || '',
    });

    // No token means the user is not logged in
    if (!token) {
      throw new UnauthorizedError('Please log in to continue');
    }

    // Token is valid — attach user info to the request.
    // Every route handler after this middleware can read req.user.
    req.user = {
      id: Number(token.sub),  // sub is the user ID stored by NextAuth
      email: token.email as string | undefined,
    };

    next();
  } catch (error) {
    next(error);
  }
};