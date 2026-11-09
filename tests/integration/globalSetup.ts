import { execFileSync } from "node:child_process";
import { PRISMA_BIN, requireTestDatabaseUrl } from "./testEnv";

// Apply the committed migrations to the test database before any test file runs.
// `migrate deploy` never drops data; tests clear their own rows between cases.
export default function setup(): void {
  const testDatabaseUrl = requireTestDatabaseUrl();
  // The test database is not pooled. directUrl still has to resolve.
  execFileSync(PRISMA_BIN, ["migrate", "deploy"], {
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      DATABASE_URL_UNPOOLED: testDatabaseUrl,
    },
    stdio: "pipe",
  });
}
