import { prisma } from '../../infrastructure/database';

export const authRepository = {
  // Find a user by phone number — used during login
  // and to check for duplicates during registration
  findUserByNumber: async (number: string) => {
    return prisma.user.findUnique({
      where: { number },
    });
  },

  // Find a user by email — checks for duplicate emails
  findUserByEmail: async (email: string) => {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  // Create a new user AND their balance in one transaction.
  // If balance creation fails, the user is also rolled back —
  // every user must have a wallet from day one.
  createUserWithBalance: async (data: {
    name: string;
    number: string;
    password: string;
    email?: string;
  }) => {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          number: data.number,
          password: data.password,
          email: data.email,
        },
      });

      await tx.balance.create({
        data: {
          userId: user.id,
          amount: 0,
          locked: 0,
        },
      });

      return user;
    });
  },
};