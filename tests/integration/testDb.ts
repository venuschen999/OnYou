import { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "./testEnv";

export const TEST_DATABASE_URL: string = requireTestDatabaseUrl();

// Integration tests talk to the test database only, never DATABASE_URL.
export const testPrisma = new PrismaClient({
  datasourceUrl: TEST_DATABASE_URL,
});

export async function resetTestDatabase(): Promise<void> {
  await testPrisma.$executeRawUnsafe(
    'TRUNCATE TABLE "DailyFeeding", "FocusSession", "Pet", "User" CASCADE',
  );
}
