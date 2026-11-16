import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// Issue #6: Playwright smoke tests in e2e/. The app reads DATABASE_URL and
// JWT_SECRET from the environment: .env locally, a throwaway Postgres service
// in CI. Never point these tests at Neon.
// Load .env into the test workers too: helpers that move stored timestamps
// (#26) run in Node, not in Next.js, so they do not see Next's env file.
config({ quiet: true });
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const SERVER_START_TIMEOUT_MS = 180_000;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  // A stray test.only must not shrink the CI run.
  forbidOnly: isCI,
  // No retries: a flaky smoke test should fail loudly, not pass on a rerun.
  retries: 0,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI tests the production build; locally a running dev server is reused.
    command: isCI ? "npm run build && npm run start" : "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: SERVER_START_TIMEOUT_MS,
  },
});
