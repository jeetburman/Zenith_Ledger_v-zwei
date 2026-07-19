import { EventEmitter } from 'events';

// Single shared EventEmitter for the entire API.
// Modules communicate through this instead of
// importing each other directly.
//
// This is the microservices migration seam —
// when we split, this file alone gets replaced
// with a Kafka or RabbitMQ client.
// Every emit() and on() call across all modules
// stays completely unchanged.
class EventBus extends EventEmitter {
  constructor() {
    super();
    // Raise the limit to avoid Node.js warnings
    // as we register more listeners across modules
    this.setMaxListeners(20);
  }
}

export const eventBus = new EventBus();

// ─── Event name constants ───────────────────────────────
// Defining event names as constants prevents typos.
// A typo in a string event name causes silent failures
// that are very hard to debug.
export const EVENTS = {
  TRANSACTION_COMPLETED: 'transaction.completed',
  ONRAMP_COMPLETED: 'onramp.completed',
  ONRAMP_FAILED: 'onramp.failed',
  EXPENSE_CREATED: 'expense.created',
} as const;