import { transactionRepository } from './transaction.repository';
import { eventBus, EVENTS } from '../../shared/events/eventBus';
import {
  BadRequestError,
  NotFoundError,
} from '../../shared/errors/AppError';

export const transactionService = {

  // Send money from one user to another by phone number.
  // This is the main P2P transfer function.
  sendMoney: async (
    fromUserId: number,
    toUserNumber: string,
    amount: number
  ) => {
    // ── Validation ──────────────────────────────────────

    if (amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }

    // Minimum transfer — 1 rupee (100 paise)
    if (amount < 100) {
      throw new BadRequestError(
        'Minimum transfer amount is ₹1 (100 paise)'
      );
    }

    // Look up the recipient by phone number
    const toUser = await transactionRepository.findUserByNumber(
      toUserNumber
    );

    if (!toUser) {
      throw new NotFoundError(
        'No user found with that phone number'
      );
    }

    // Can't send money to yourself
    if (toUser.id === fromUserId) {
      throw new BadRequestError(
        'You cannot send money to yourself'
      );
    }

    // Check sender has a wallet
    const fromBalance =
      await transactionRepository.findBalanceByUserId(fromUserId);

    if (!fromBalance) {
      throw new NotFoundError('Your wallet was not found');
    }

    // Check available balance (amount minus locked funds)
    const available = fromBalance.amount - fromBalance.locked;
    if (available < amount) {
      throw new BadRequestError(
        `Insufficient balance. Available: ${available} paise`
      );
    }

    // ── Execute transfer ─────────────────────────────────
    // The repository handles the atomic DB transaction
    const transfer = await transactionRepository.createTransfer(
      fromUserId,
      toUser.id,
      amount
    );

    // ── Notify other modules ────────────────────────────
    // Any module can listen to this event.
    // For now nothing listens — but the expense module
    // could auto-log this as an expense later.
    eventBus.emit(EVENTS.TRANSACTION_COMPLETED, {
      fromUserId,
      toUserId: toUser.id,
      amount,
      transferId: transfer.id,
    });

    return {
      id: transfer.id,
      amount: transfer.amount,
      status: transfer.status,
      timestamp: transfer.timestamp,
      to: {
        name: toUser.name,
        number: toUser.number,
      },
    };
  },

  // Get full transfer history for a user.
  // Marks each transfer as 'sent' or 'received'
  // from the perspective of the requesting user.
  getTransferHistory: async (userId: number) => {
    const transfers =
      await transactionRepository.findTransfersByUserId(userId);

    return transfers.map((transfer) => ({
      id: transfer.id,
      amount: transfer.amount,
      status: transfer.status,
      timestamp: transfer.timestamp,
      // Direction tells the frontend whether to show
      // this as money going out (red) or coming in (green)
      direction:
        transfer.fromUserId === userId ? 'sent' : 'received',
      counterparty:
        transfer.fromUserId === userId
          ? transfer.toUser
          : transfer.fromUser,
    }));
  },

  // Get a single transfer — used for a detail/receipt view
  getTransferById: async (id: number, userId: number) => {
    const transfer =
      await transactionRepository.findTransferById(id);

    if (!transfer) {
      throw new NotFoundError('Transfer not found');
    }

    // Only the sender or receiver can view a transfer
    if (
      transfer.fromUserId !== userId &&
      transfer.toUserId !== userId
    ) {
      throw new NotFoundError('Transfer not found');
    }

    return {
      id: transfer.id,
      amount: transfer.amount,
      status: transfer.status,
      timestamp: transfer.timestamp,
      direction:
        transfer.fromUserId === userId ? 'sent' : 'received',
      from: transfer.fromUser,
      to: transfer.toUser,
    };
  },
};