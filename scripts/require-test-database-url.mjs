import { config } from "dotenv";
import process from "node:process";

// Same source as tests/integration/testEnv.ts, so a URL in .env is visible
// before Vitest starts the Prisma global setup.
config({ quiet: true });

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) {
  console.error(
    "TEST_DATABASE_URL must be set to an isolated database before integration tests run",
  );
  process.exit(1);
}
