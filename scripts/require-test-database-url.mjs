import process from "node:process";

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) {
  console.error(
    "TEST_DATABASE_URL must be set to an isolated database before integration tests run",
  );
  process.exit(1);
}
