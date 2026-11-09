import { PrismaClient } from "@prisma/client";

// One client per process. In development, hot reload re-evaluates modules,
// so the client is cached on globalThis to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
