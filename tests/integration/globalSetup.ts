import { execFileSync } from "node:child_process";
import { config } from "dotenv";

const PRISMA_BIN = "node_modules/.bin/prisma";

// Apply the committed migrations to the test database before any test file runs.
// `migrate deploy` never drops data; tests clear their own rows between cases.
export default function setup(): void {
  config({ quiet: true });
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL must be set to run integration tests");
  }
  execFileSync(PRISMA_BIN, ["migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "pipe",
  });
}
