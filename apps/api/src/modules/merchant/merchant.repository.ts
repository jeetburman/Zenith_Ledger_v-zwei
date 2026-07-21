import { prisma } from '../../infrastructure/database';

export const merchantRepository = {

  findMerchantByEmail: async (email: string) => {
    return prisma.merchant.findUnique({ where: { email } });
  },

  findMerchantById: async (id: number) => {
    return prisma.merchant.findUnique({ where: { id } });
  },

  createMerchant: async (data: {
    name: string;
    email: string;
    password: string;
  }) => {
    return prisma.merchant.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        authType: 'Credentials',
      },
    });
  },

  // Get all transactions received by a merchant
  findTransactionsByMerchantId: async (merchantId: number) => {
    return prisma.merchantTransaction.findMany({
      where: { merchantId },
      include: {
        user: {
          select: { id: true, name: true, number: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  },

  // Get merchant revenue summary
  getMerchantSummary: async (merchantId: number) => {
    const result = await prisma.merchantTransaction.aggregate({
      where: {
        merchantId,
        status: 'Completed',
      },
      _sum: { amount: true },
      _count: { id: true },
    });
    return result;
  },

  // Create a merchant transaction when a user pays
  // Deducts from user balance and records the transaction
  // atomically in a Prisma $transaction
  processMerchantPayment: async (
    userId: number,
    merchantId: number,
    amount: number,
    reference: string
  ) => {
    return prisma.$transaction(async (tx) => {
      // Lock user's balance row before reading
      const userBalance = await tx.$queryRaw<
        { amount: number; locked: number }[]
      >`
        SELECT amount, locked FROM "Balance"
        WHERE "userId" = ${userId}
        FOR UPDATE
      `;

      if (!userBalance[0]) {
        throw new Error('User wallet not found');
      }

      const available =
        userBalance[0].amount - userBalance[0].locked;

      if (available < amount) {
        throw new Error('Insufficient balance');
      }

      // Deduct from user
      await tx.balance.update({
        where: { userId },
        data: { amount: { decrement: amount } },
      });

      // Create the merchant transaction record
      const transaction = await tx.merchantTransaction.create({
        data: {
          userId,
          merchantId,
          amount,
          reference,
          status: 'Completed',
        },
      });

      return transaction;
    });
  },
};