import { prisma } from '../../infrastructure/database';

// The repository is the only place that talks to the database.
// No business logic here — just raw queries.
// This makes it easy to swap the DB later without
// touching any business logic.

export const walletRepository = {

  // Find a user's balance record by their userId
  findBalanceByUserId: async (userId: number) => {
    return prisma.balance.findUnique({
      where: { userId },
    });
  },

  // Create a fresh balance record for a new user.
  // Called when a user registers for the first time.
  createBalance: async (userId: number) => {
    return prisma.balance.create({
      data: {
        userId,
        amount: 0,
        locked: 0,
      },
    });
  },

  // Find an on-ramp transaction by its unique token.
  // The bank-webhook uses this to look up which transaction
  // it's updating when a payment settles.
  findOnRampByToken: async (token: string) => {
    return prisma.onRampTransaction.findUnique({
      where: { token },
    });
  },

  // Create a new on-ramp transaction record.
  // This is called when a user initiates a bank deposit.
  // Status starts as Processing until bank confirms.
  createOnRampTransaction: async (data: {
    userId: number;
    amount: number;
    provider: string;
    token: string;
  }) => {
    return prisma.onRampTransaction.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        provider: data.provider,
        token: data.token,
        status: 'Processing',
        startTime: new Date(),
      },
    });
  },

  // This is the most critical DB operation in the wallet.
  // When a bank confirms payment, we:
  //   1. Update the on-ramp transaction status to Success
  //   2. Add the amount to the user's balance
  // Both must succeed or neither should — that's why we
  // use a Prisma transaction ($transaction).
  // If step 2 fails after step 1 succeeds, Prisma rolls
  // everything back so money is never lost.
  processOnRampSuccess: async (token: string, userId: number, amount: number) => {
    return prisma.$transaction([
      // Step 1: mark the on-ramp transaction as successful
      prisma.onRampTransaction.update({
        where: { token },
        data: { status: 'Success' },
      }),
      // Step 2: add the amount to the user's balance
      prisma.balance.update({
        where: { userId },
        data: {
          amount: { increment: amount },
        },
      }),
    ]);
  },

  // If the bank reports a failure, mark the transaction
  // as failed. Balance is untouched.
  processOnRampFailure: async (token: string) => {
    return prisma.onRampTransaction.update({
      where: { token },
      data: { status: 'Failure' },
    });
  },

  // Fetch all on-ramp transactions for a user,
  // newest first — used for transaction history page.
  findOnRampTransactionsByUserId: async (userId: number) => {
    return prisma.onRampTransaction.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
    });
  },
};