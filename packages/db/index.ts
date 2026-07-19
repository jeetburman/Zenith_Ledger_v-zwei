// Single export point for the Prisma client.
// Every app that needs DB access imports from here —
// never directly from @prisma/client.
// This ensures only ONE Prisma client instance exists
// across the entire monorepo.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// In development, Next.js hot reload creates a new module
// instance on every file change which would create a new
// PrismaClient each time and exhaust your DB connections.
// Storing it on globalThis prevents that.
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export Prisma types so other packages don't need
// to install @prisma/client themselves
export * from '@prisma/client';