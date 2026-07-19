import { walletRepository } from './wallet.repository';
import { eventBus, EVENTS } from '../../shared/events/eventBus';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../shared/errors/AppError';

// The service contains all business logic.
// It uses the repository for data and throws
// AppErrors for anything that goes wrong.
// Routes call services — never the repository directly.

export const walletService = {

  // Get the balance for a user.
  // Returns amount and locked separately so the UI
  // can show "available" vs "pending" balance.
  getBalance: async (userId: number) => {
    const balance = await walletRepository.findBalanceByUserId(userId);

    if (!balance) {
      throw new NotFoundError('Wallet not found for this user');
    }

    return {
      // amount is stored in paise (smallest unit).
      // We return it as-is — the frontend formats it.
      amount: balance.amount,
      locked: balance.locked,
      // Available = total minus what's locked in pending transactions
      available: balance.amount - balance.locked,
    };
  },

  // Initiate a bank deposit (on-ramp).
  // Creates a pending transaction and returns a token.
  // The bank-webhook will later call processOnRamp()
  // when the payment settles.
  initiateOnRamp: async (userId: number, amount: number, provider: string) => {
    // Minimum deposit validation
    if (amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }

    if (amount < 100) {
      throw new BadRequestError('Minimum deposit amount is ₹1 (100 paise)');
    }

    // Generate a unique token for this transaction.
    // The bank uses this token to identify the payment
    // when calling back our webhook.
    const token = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const transaction = await walletRepository.createOnRampTransaction({
      userId,
      amount,
      provider,
      token,
    });

    return {
      token: transaction.token,
      amount: transaction.amount,
      provider: transaction.provider,
      status: transaction.status,
    };
  },

  // Called by bank-webhook when a payment succeeds.
  // Validates the token, checks it hasn't been processed,
  // then credits the user's wallet.
  processOnRampSuccess: async (token: string) => {
    const transaction = await walletRepository.findOnRampByToken(token);

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Prevent double-processing the same payment
    if (transaction.status !== 'Processing') {
      throw new ConflictError(
        `Transaction already ${transaction.status.toLowerCase()}`
      );
    }

    await walletRepository.processOnRampSuccess(
      token,
      transaction.userId,
      transaction.amount
    );

    // Emit an event so other modules can react.
    // For example, an email/notification module could
    // listen for this and send a deposit confirmation.
    eventBus.emit(EVENTS.ONRAMP_COMPLETED, {
      userId: transaction.userId,
      amount: transaction.amount,
    });

    return { message: 'Wallet credited successfully' };
  },

  // Called by bank-webhook when a payment fails.
  processOnRampFailure: async (token: string) => {
    const transaction = await walletRepository.findOnRampByToken(token);

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.status !== 'Processing') {
      throw new ConflictError(
        `Transaction already ${transaction.status.toLowerCase()}`
      );
    }

    await walletRepository.processOnRampFailure(token);

    eventBus.emit(EVENTS.ONRAMP_FAILED, {
      userId: transaction.userId,
      amount: transaction.amount,
    });

    return { message: 'Transaction marked as failed' };
  },

  // Fetch a user's full on-ramp transaction history
  getOnRampTransactions: async (userId: number) => {
    return walletRepository.findOnRampTransactionsByUserId(userId);
  },
};