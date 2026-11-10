import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// One client per process. In development, hot reload re-evaluates modules,
// so the client is cached on globalThis to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

function databaseUrlFromEnv(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set before the database client is created",
    );
  }
  return databaseUrl;
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient(databaseUrlFromEnv());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
