import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { expenseService, createExpenseSchema } from './expense.service';
import { authMiddleware } from '../../shared/middleware/authMiddleware';
import { BadRequestError } from '../../shared/errors/AppError';

const router = Router();

// All expense routes require authentication
router.use(authMiddleware);

// POST /api/expenses
// Log a new expense
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = createExpenseSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestError(
          result.error.errors.map((e) => e.message).join(', ')
        );
      }

      const expense = await expenseService.createExpense(
        req.user!.id,
        result.data
      );

      res.status(201).json({
        status: 'success',
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/expenses
// Get all expenses, optional ?category=Food filter
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const expenses = await expenseService.getExpenses(
        req.user!.id,
        category
      );

      res.json({
        status: 'success',
        data: expenses,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/expenses/summary
// Budget calculator — spending breakdown by category.
// Optional ?from=2026-01-01&to=2026-12-31 date range.
// IMPORTANT: this route must be defined BEFORE /:id
// otherwise Express matches 'summary' as an id param.
router.get(
  '/summary',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to } = req.query as {
        from?: string;
        to?: string;
      };

      const summary = await expenseService.getSummary(
        req.user!.id,
        from,
        to
      );

      res.json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/expenses/:id
// Delete a single expense
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new BadRequestError('Invalid expense ID');
      }

      const result = await expenseService.deleteExpense(
        id,
        req.user!.id
      );

      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;