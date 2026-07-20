import { currencyService } from './currency.service';
import { io } from '../../server';

// How often to fetch new rates in milliseconds
const POLL_INTERVAL_MS = 30_000; // 30 seconds

// Starts the polling loop.
// Called once when the server boots.
// Every 30 seconds:
//   1. Fetches fresh rates from Frankfurter
//   2. Saves to Redis and PostgreSQL
//   3. Broadcasts to all connected WebSocket clients
export const startCurrencyPoller = async () => {
  console.log('Currency poller starting...');

  // Fetch immediately on startup so rates are
  // available before the first 30s interval
  await pollAndBroadcast();

  // Then poll on a fixed interval
  setInterval(async () => {
    await pollAndBroadcast();
  }, POLL_INTERVAL_MS);
};

const pollAndBroadcast = async () => {
  try {
    const rates = await currencyService.fetchAndStoreRates();

    // Broadcast to ALL connected Socket.io clients.
    // Any browser with the currency feed open receives
    // this update instantly without polling themselves.
    io.emit('rates:update', {
      base: rates.base,
      rates: rates.rates,
      updatedAt: new Date().toISOString(),
    });

  } catch (err: any) {
    // Log but don't crash — a failed rate fetch
    // shouldn't take down the whole API
    console.error('Currency poll failed:', err.message);
  }
};