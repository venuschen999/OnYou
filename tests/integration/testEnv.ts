import { config } from "dotenv";

export const PRISMA_BIN = "node_modules/.bin/prisma";

export function requireTestDatabaseUrl(): string {
  config({ quiet: true });
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL must be set to run integration tests");
  }
  return testDatabaseUrl;
}
