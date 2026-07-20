import { prisma } from '../../infrastructure/database';
import { ExpenseCategory } from '@repo/db';

export const expenseRepository = {

  // Create a new expense record for a user
  createExpense: async (data: {
    userId: number;
    title: string;
    amount: number;
    category: ExpenseCategory;
    date: Date;
    note?: string;
  }) => {
    return prisma.expense.create({ data });
  },

  // Get all expenses for a user, newest first.
  // Optional category filter for filtered views.
  findExpensesByUserId: async (
    userId: number,
    category?: ExpenseCategory
  ) => {
    return prisma.expense.findMany({
      where: {
        userId,
        ...(category && { category }),
      },
      orderBy: { date: 'desc' },
    });
  },

  // Find a single expense by ID
  findExpenseById: async (id: number) => {
    return prisma.expense.findUnique({ where: { id } });
  },

  // Delete an expense — only the owner can do this,
  // enforced in the service layer
  deleteExpense: async (id: number) => {
    return prisma.expense.delete({ where: { id } });
  },

  // Get total spent per category for a user
  // within an optional date range.
  // Uses Prisma's groupBy to aggregate in the DB —
  // faster than fetching all records and summing in JS.
  getSpendingByCategory: async (
    userId: number,
    from?: Date,
    to?: Date
  ) => {
    return prisma.expense.groupBy({
      by: ['category'],
      where: {
        userId,
        ...(from || to
          ? {
              date: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    });
  },

  // Get total amount spent in a period
  getTotalSpent: async (userId: number, from?: Date, to?: Date) => {
    const result = await prisma.expense.aggregate({
      where: {
        userId,
        ...(from || to
          ? {
              date: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      },
      _sum: { amount: true },
      _count: { id: true },
    });
    return result;
  },
};