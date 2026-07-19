// Re-export the shared Prisma client from packages/db.
// All modules import prisma from here, not directly
// from @repo/db — this gives us one place to add
// database middleware or logging later if needed.
export { prisma } from '@repo/db';