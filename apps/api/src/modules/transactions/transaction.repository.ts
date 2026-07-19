import { prisma } from '../../infrastructure/database';

export const transactionRepository = {
  // Find a user by their phone number.
  // Used to look up the recipient before sending money.
  findUserByNumber: async (number: string) => {
    return prisma.user.findUnique({
      where: { number },
      select: {
        id: true,
        name: true,
        number: true,
        // Never select password — even internally
      },
    });
  },

  // Find a user's balance by userId.
  // Used to check if sender has enough funds.
  findBalanceByUserId: async (userId: number) => {
    return prisma.balance.findUnique({
      where: { userId },
    });
  },

  // The core transfer operation.
  // All three DB writes happen inside a single Prisma transaction.
  // If any one fails, all three are rolled back automatically.
  // This guarantees money is never created or destroyed —
  // only moved between wallets.
  createTransfer: async (
    fromUserId: number,
    toUserId: number,
    amount: number
  ) => {
    return prisma.$transaction(async (tx) => {
      // Step 1 — Lock the sender's balance row before reading it.
      // This prevents two simultaneous transfers from
      // both reading the same balance and both succeeding
      // even when there's only enough for one.
      // Raw SQL with FOR UPDATE locks the row until
      // the transaction completes.
      const senderBalance = await tx.$queryRaw<{ amount: number; locked: number }[]>`
        SELECT amount, locked FROM "Balance"
        WHERE "userId" = ${fromUserId}
        FOR UPDATE
      `;

      if (!senderBalance[0]) {
        throw new Error('Sender wallet not found');
      }

      const available =
        senderBalance[0].amount - senderBalance[0].locked;

      if (available < amount) {
        throw new Error('Insufficient balance');
      }

      // Step 2 — Deduct from sender
      await tx.balance.update({
        where: { userId: fromUserId },
        data: { amount: { decrement: amount } },
      });

      // Step 3 — Credit receiver
      await tx.balance.update({
        where: { userId: toUserId },
        data: { amount: { increment: amount } },
      });

      // Step 4 — Create the transfer record
      const transfer = await tx.p2PTransfer.create({
        data: {
          fromUserId,
          toUserId,
          amount,
          status: 'Completed',
        },
      });

      return transfer;
    });
  },

  // Fetch all transfers involving a user —
  // both sent and received — newest first.
  findTransfersByUserId: async (userId: number) => {
    return prisma.p2PTransfer.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      include: {
        fromUser: {
          select: { id: true, name: true, number: true },
        },
        toUser: {
          select: { id: true, name: true, number: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  },

  // Fetch a single transfer by ID.
  // Used to show transfer details.
  findTransferById: async (id: number) => {
    return prisma.p2PTransfer.findUnique({
      where: { id },
      include: {
        fromUser: {
          select: { id: true, name: true, number: true },
        },
        toUser: {
          select: { id: true, name: true, number: true },
        },
      },
    });
  },
};