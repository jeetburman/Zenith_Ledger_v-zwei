import { ExpenseCategory } from '@repo/db';
import { expenseRepository } from './expense.repository';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../shared/errors/AppError';
import { z } from 'zod';

// Validation schema — exported so the router can use it too
export const createExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  amount: z.number().int().positive('Amount must be positive'),
  category: z.nativeEnum(ExpenseCategory),
  date: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

export const expenseService = {

  // Log a new expense
  createExpense: async (
    userId: number,
    input: z.infer<typeof createExpenseSchema>
  ) => {
    if (input.amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }

    const expense = await expenseRepository.createExpense({
      userId,
      title: input.title,
      amount: input.amount,
      category: input.category,
      date: input.date ? new Date(input.date) : new Date(),
      note: input.note,
    });

    return expense;
  },

  // Get all expenses for a user with optional category filter
  getExpenses: async (userId: number, category?: string) => {
    // Validate category if provided
    if (category && !Object.values(ExpenseCategory).includes(category as ExpenseCategory)) {
      throw new BadRequestError(
        `Invalid category. Valid values: ${Object.values(ExpenseCategory).join(', ')}`
      );
    }

    return expenseRepository.findExpensesByUserId(
      userId,
      category as ExpenseCategory | undefined
    );
  },

  // Delete an expense — only the owner can delete it
  deleteExpense: async (id: number, userId: number) => {
    const expense = await expenseRepository.findExpenseById(id);

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    // Prevent users from deleting other users' expenses
    if (expense.userId !== userId) {
      throw new ForbiddenError(
        'You can only delete your own expenses'
      );
    }

    await expenseRepository.deleteExpense(id);
    return { message: 'Expense deleted successfully' };
  },

  // Budget summary — the calculator feature.
  // Returns spending by category, total spent,
  // and percentage breakdown.
  getSummary: async (
    userId: number,
    from?: string,
    to?: string
  ) => {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    // Run both queries in parallel — faster than sequential
    const [byCategory, totals] = await Promise.all([
      expenseRepository.getSpendingByCategory(
        userId,
        fromDate,
        toDate
      ),
      expenseRepository.getTotalSpent(userId, fromDate, toDate),
    ]);

    const totalAmount = totals._sum.amount || 0;
    const totalCount = totals._count.id || 0;

    // Build category breakdown with percentage of total
    const categories = byCategory.map((item) => {
      const spent = item._sum.amount || 0;
      return {
        category: item.category,
        spent,
        count: item._count.id,
        // Percentage of total spending this category represents
        percentage:
          totalAmount > 0
            ? Math.round((spent / totalAmount) * 100)
            : 0,
      };
    });

    // Find the biggest single category
    const biggestCategory = categories[0] || null;

    return {
      totalSpent: totalAmount,
      totalTransactions: totalCount,
      biggestCategory,
      categories,
      period: {
        from: fromDate?.toISOString() || null,
        to: toDate?.toISOString() || null,
      },
    };
  },
};