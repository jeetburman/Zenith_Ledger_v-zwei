import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { merchantRepository } from './merchant.repository';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../../shared/errors/AppError';

export const registerMerchantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const payMerchantSchema = z.object({
  merchantId: z.number().int().positive(),
  amount: z.number().int().positive(),
});

export const merchantService = {

  register: async (input: z.infer<typeof registerMerchantSchema>) => {
    const existing = await merchantRepository.findMerchantByEmail(
      input.email
    );

    if (existing) {
      throw new ConflictError(
        'A merchant account with this email already exists'
      );
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const merchant = await merchantRepository.createMerchant({
      name: input.name,
      email: input.email,
      password: hashedPassword,
    });

    return {
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
    };
  },

  // Get merchant profile and revenue summary
  getMerchantDashboard: async (merchantId: number) => {
    const merchant = await merchantRepository.findMerchantById(
      merchantId
    );

    if (!merchant) {
      throw new NotFoundError('Merchant not found');
    }

    const summary =
      await merchantRepository.getMerchantSummary(merchantId);

    return {
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      totalRevenue: summary._sum.amount || 0,
      totalTransactions: summary._count.id || 0,
    };
  },

  // Get all transactions for a merchant
  getTransactions: async (merchantId: number) => {
    return merchantRepository.findTransactionsByMerchantId(merchantId);
  },

  // Called when a user pays a merchant from their dashboard
  payMerchant: async (
    userId: number,
    merchantId: number,
    amount: number
  ) => {
    if (amount < 100) {
      throw new BadRequestError(
        'Minimum payment amount is ₹1 (100 paise)'
      );
    }

    const merchant =
      await merchantRepository.findMerchantById(merchantId);

    if (!merchant) {
      throw new NotFoundError('Merchant not found');
    }

    // Generate a unique reference for this payment
    const reference = `PAY-${userId}-${merchantId}-${Date.now()}`;

    const transaction =
      await merchantRepository.processMerchantPayment(
        userId,
        merchantId,
        amount,
        reference
      );

    return {
      id: transaction.id,
      amount: transaction.amount,
      reference: transaction.reference,
      status: transaction.status,
      merchant: {
        id: merchant.id,
        name: merchant.name,
      },
    };
  },
};