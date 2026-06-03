import { PrismaClient } from "@prisma/client";

/**
 * A single Prisma client instance, reused across hot-reloads in development and
 * across serverless invocations on Vercel. Creating a new client per request
 * would exhaust the database connection pool.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
