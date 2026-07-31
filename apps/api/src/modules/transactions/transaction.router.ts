import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { transactionService } from './transaction.service';
import { authMiddleware } from '../../shared/middleware/authMiddleware';
import { BadRequestError } from '../../shared/errors/AppError';

const router = Router();

// All transaction routes require authentication
router.use(authMiddleware);

// ── Validation schemas ──────────────────────────────────────

const sendMoneySchema = z.object({
  toUserNumber: z
    .string()
    .min(10, 'Enter a valid phone number'),
  amount: z
    .number()
    .int('Amount must be a whole number')
    .positive('Amount must be positive'),
});

// ── Routes ──────────────────────────────────────────────────

// POST /api/transactions/send
// Sends money from the logged-in user to another user
router.post(
  '/send',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = sendMoneySchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestError(
          result.error.errors.map((e) => e.message).join(', ')
        );
      }

      const { toUserNumber, amount } = result.data;

      const transfer = await transactionService.sendMoney(
        req.user!.id,
        toUserNumber,
        amount
      );

      res.status(201).json({
        status: 'success',
        message: `₹${amount / 100} sent successfully`,
        data: transfer,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/transactions/history
// Returns all transfers for the logged-in user
router.get(
  '/history',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await transactionService.getTransferHistory(
        req.user!.id
      );

      res.json({
        status: 'success',
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/transactions/:id
// Returns a single transfer detail
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idParam = req.params.id;
      if (!idParam) {
        throw new BadRequestError('Invalid transfer ID');
      }
      const id = parseInt(idParam);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid transfer ID');
      }

      const transfer = await transactionService.getTransferById(
        id,
        req.user!.id
      );

      res.json({
        status: 'success',
        data: transfer,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;