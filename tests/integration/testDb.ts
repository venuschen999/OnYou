import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ quiet: true });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL must be set to run integration tests");
}

export const TEST_DATABASE_URL: string = testDatabaseUrl;

// Integration tests talk to the test database only, never DATABASE_URL.
export const testPrisma = new PrismaClient({
  datasourceUrl: TEST_DATABASE_URL,
});

export async function resetTestDatabase(): Promise<void> {
  await testPrisma.$executeRawUnsafe(
    'TRUNCATE TABLE "DailyFeeding", "FocusSession", "Pet", "User" CASCADE',
  );
}
