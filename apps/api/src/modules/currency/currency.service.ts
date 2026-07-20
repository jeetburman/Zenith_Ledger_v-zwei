import { currencyRepository } from './currency.repository';
import { BadRequestError } from '../../shared/errors/AppError';

// Frankfurter API — free, no key needed, maintained by ECB data
const FRANKFURTER_URL = 'https://api.frankfurter.app';

// The base currency we fetch all rates relative to
const BASE_CURRENCY = 'USD';

// The currencies we care about in this app
const TARGET_CURRENCIES = ['INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

export const currencyService = {

  // Fetch fresh rates from Frankfurter and store them.
  // Called by the polling loop every 30 seconds.
  // Also called on server startup so rates are
  // available immediately without waiting for first poll.
  fetchAndStoreRates: async () => {
    // Build the Frankfurter URL:
    // /latest?from=USD&to=INR,EUR,GBP,...
    const to = TARGET_CURRENCIES.join(',');
    const url = `${FRANKFURTER_URL}/latest?from=${BASE_CURRENCY}&to=${to}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const data = await response.json() as {
      base: string;
      date: string;
      rates: Record<string, number>;
    };

    // Store in Redis for fast reads
    await currencyRepository.cacheRates(data.rates, data.base);

    // Store in PostgreSQL for history
    await currencyRepository.saveRatesToDB(data.rates, data.base);

    console.log(`Rates updated at ${new Date().toISOString()}`);

    return {
      base: data.base,
      date: data.date,
      rates: data.rates,
    };
  },

  // Get current rates — from Redis cache if available,
  // otherwise fetch fresh from Frankfurter.
  // This is what the HTTP endpoint calls.
  getCurrentRates: async () => {
    // Try cache first — Redis read is ~1ms vs ~200ms API call
    const cached = await currencyRepository.getCachedRates();
    if (cached) {
      return { ...cached, fromCache: true };
    }

    // Cache miss — fetch fresh
    const fresh = await currencyService.fetchAndStoreRates();
    return { ...fresh, fromCache: false };
  },

  // Convert an amount from one currency to another.
  // Uses the latest cached rate.
  convertAmount: async (
    from: string,
    to: string,
    amount: number
  ) => {
    if (from === to) {
      return { from, to, amount, converted: amount, rate: 1 };
    }

    if (amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }

    const rateRecord = await currencyRepository.getLatestRate(
      from.toUpperCase(),
      to.toUpperCase()
    );

    if (!rateRecord) {
      throw new BadRequestError(
        `No rate found for ${from} → ${to}. ` +
        `Supported currencies: USD, ${TARGET_CURRENCIES.join(', ')}`
      );
    }

    const converted = amount * rateRecord.rate;

    return {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      amount,
      converted: Math.round(converted * 100) / 100,
      rate: rateRecord.rate,
      rateDate: rateRecord.fetchedAt,
    };
  },
};