import { prisma } from '../../infrastructure/database';
import { redis } from '../../infrastructure/cache/redisClient';

// The key we use to store rates in Redis.
// All rate data lives under this single key as a JSON string.
const RATES_CACHE_KEY = 'currency:rates';

// How long rates stay in Redis before expiring (seconds).
// Frankfurter updates rates once a day so 60s is more than fresh.
const CACHE_TTL_SECONDS = 60;

export const currencyRepository = {

  // Save fetched rates to Redis cache.
  // EX sets expiry in seconds — after 60s Redis automatically
  // deletes this key so stale data never persists.
  cacheRates: async (rates: Record<string, number>, base: string) => {
    const payload = JSON.stringify({
      base,
      rates,
      cachedAt: new Date().toISOString(),
    });
    await redis.set(RATES_CACHE_KEY, payload, { ex: CACHE_TTL_SECONDS });
  },

  // Read rates from Redis.
  // Returns null if cache has expired or was never set.
  getCachedRates: async () => {
    const data = await redis.get(RATES_CACHE_KEY);
    if (!data) return null;
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return parsed as {
      base: string;
      rates: Record<string, number>;
      cachedAt: string;
    };
  },

  // Write each rate to PostgreSQL as a historical record.
  // We use createMany to insert all currency pairs at once
  // instead of one insert per currency.
  saveRatesToDB: async (
    rates: Record<string, number>,
    base: string
  ) => {
    const data = Object.entries(rates).map(([toCurrency, rate]) => ({
      fromCurrency: base,
      toCurrency,
      rate,
      fetchedAt: new Date(),
    }));

    await prisma.currencyRate.createMany({ data });
  },

  // Get the latest rate for a specific currency pair.
  // Used by the conversion endpoint.
  getLatestRate: async (from: string, to: string) => {
    return prisma.currencyRate.findFirst({
      where: { fromCurrency: from, toCurrency: to },
      orderBy: { fetchedAt: 'desc' },
    });
  },
};