import { prisma } from '../../infrastructure/database';
import { Router, Request, Response, NextFunction } from 'express';
import { merchantService, registerMerchantSchema, payMerchantSchema } from './merchant.service';
import { authMiddleware } from '../../shared/middleware/authMiddleware';
import { BadRequestError } from '../../shared/errors/AppError';

const router = Router();

// POST /api/merchant/register
// Public — create a new merchant account
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = registerMerchantSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestError(
          result.error.errors.map((e) => e.message).join(', ')
        );
      }

      const merchant = await merchantService.register(result.data);

      res.status(201).json({
        status: 'success',
        message: 'Merchant account created',
        data: merchant,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/merchant/dashboard
// Protected — merchant's own dashboard data
// Note: this uses authMiddleware which reads the NextAuth
// session. The merchant logs in via merchant-app which
// uses the same NEXTAUTH_SECRET so the token is valid here.
router.get(
  '/dashboard',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await merchantService.getMerchantDashboard(
        req.user!.id
      );
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/merchant/transactions
// Protected — all transactions received by this merchant
router.get(
  '/transactions',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transactions = await merchantService.getTransactions(
        req.user!.id
      );
      res.json({ status: 'success', data: transactions });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/merchant/pay
// Protected — user pays a merchant (called from user-app)
// Uses the USER's auth session, not the merchant's
router.post(
  '/pay',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = payMerchantSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestError(
          result.error.errors.map((e) => e.message).join(', ')
        );
      }

      const { merchantId, amount } = result.data;

      const transaction = await merchantService.payMerchant(
        req.user!.id,
        merchantId,
        amount
      );

      res.status(201).json({
        status: 'success',
        message: 'Payment successful',
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/merchant/list
// Public — list all merchants so users can pay them
router.get(
  '/list',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const merchants = await prisma.merchant.findMany({
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
      res.json({ status: 'success', data: merchants });
    } catch (error) {
      next(error);
    }
  }
);

export default router;