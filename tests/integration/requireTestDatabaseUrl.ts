// Direct `vitest --config vitest.integration.config.ts` must use the same
// isolated database as `npm run test:integration`. Do not log the URL (AGENTS.md §12).
export default function requireTestDatabaseUrl(): void {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!testDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL must be set to an isolated database before integration tests run",
    );
  }
}
