import { createPrismaClient } from "@/lib/server/db";
import { requireTestDatabaseUrl } from "./testEnv";

export const TEST_DATABASE_URL: string = requireTestDatabaseUrl();

// Integration tests talk to the test database only. The URL is passed to the
// driver adapter directly so this client does not follow DATABASE_URL.
export const testPrisma = createPrismaClient(TEST_DATABASE_URL);

export async function resetTestDatabase(): Promise<void> {
  await testPrisma.$executeRawUnsafe(
    'TRUNCATE TABLE "DailyFeeding", "FocusSession", "Pet", "User" CASCADE',
  );
}
