import { Router, Request, Response, NextFunction } from 'express';
import { authService, registerSchema } from './auth.service';
import { BadRequestError } from '../../shared/errors/AppError';

const router = Router();

// POST /api/auth/register
// Creates a new user account and wallet.
// Called by the register page in user-app.
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestError(
          result.error.errors.map((e) => e.message).join(', ')
        );
      }

      const user = await authService.register(result.data);

      res.status(201).json({
        status: 'success',
        message: 'Account created successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;