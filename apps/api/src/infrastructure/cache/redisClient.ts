import { Redis } from '@upstash/redis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not set in environment variables');
}

// @upstash/redis uses HTTP instead of TCP.
// No persistent connection = no connection limit issues.
// Works perfectly with Upstash's serverless architecture.
export const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN || '',
});

console.log('✓ Redis client ready');