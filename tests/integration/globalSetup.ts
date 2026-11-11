import { execFileSync } from "node:child_process";
import { PRISMA_BIN, requireTestDatabaseUrl } from "./testEnv";

// Apply the committed migrations to the test database before any test file runs.
// `migrate deploy` never drops data; tests clear their own rows between cases.
export default function setup(): void {
  const testDatabaseUrl = requireTestDatabaseUrl();
  // Pin both names so a developer .env cannot send migrate deploy to Neon.
  execFileSync(PRISMA_BIN, ["migrate", "deploy"], {
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      DATABASE_URL_UNPOOLED: testDatabaseUrl,
    },
    stdio: "pipe",
  });
}
