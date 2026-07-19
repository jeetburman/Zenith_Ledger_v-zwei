import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { walletService } from './wallet.service';
import { authMiddleware } from '../../shared/middleware/authMiddleware';
import { BadRequestError } from '../../shared/errors/AppError';

const router = Router();

// ─── Validation schemas ────────────────────────────────────
// Zod validates the request body before it reaches the service.
// If validation fails, we throw a BadRequestError immediately.
// The service never receives malformed data.

const initiateOnRampSchema = z.object({
  amount: z.number().int().positive(),
  provider: z.string().min(1),
});

// ─── Routes ────────────────────────────────────────────────

// GET /api/wallet/balance
// Returns the current user's balance.
// authMiddleware runs first — if not logged in, returns 401.
router.get(
  '/balance',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.user is set by authMiddleware
      const balance = await walletService.getBalance(req.user!.id);
      res.json({ status: 'success', data: balance });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/wallet/transactions
// Returns the user's on-ramp transaction history.
router.get(
  '/transactions',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transactions = await walletService.getOnRampTransactions(
        req.user!.id
      );
      res.json({ status: 'success', data: transactions });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/wallet/onramp/initiate
// Starts a bank deposit — creates a pending transaction
// and returns a token the bank will use to call back.
router.post(
  '/onramp/initiate',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body with Zod
      const result = initiateOnRampSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestError(
          result.error.errors.map((e) => e.message).join(', ')
        );
      }

      const { amount, provider } = result.data;
      const transaction = await walletService.initiateOnRamp(
        req.user!.id,
        amount,
        provider
      );

      res.status(201).json({ status: 'success', data: transaction });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/wallet/onramp/success
// Called by bank-webhook when a payment succeeds.
// No authMiddleware here — the bank calls this, not the user.
// In production you'd verify a webhook signature instead.
router.post(
  '/onramp/success',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      if (!token) {
        throw new BadRequestError('Token is required');
      }

      const result = await walletService.processOnRampSuccess(token);
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/wallet/onramp/failure
// Called by bank-webhook when a payment fails.
router.post(
  '/onramp/failure',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      if (!token) {
        throw new BadRequestError('Token is required');
      }

      const result = await walletService.processOnRampFailure(token);
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;