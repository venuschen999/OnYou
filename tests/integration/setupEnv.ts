import { requireTestDatabaseUrl } from "./testEnv";

// Runs before each test file's imports, so `src/lib/server/db.ts` connects to
// the test database, never the development one.
process.env.DATABASE_URL = requireTestDatabaseUrl();

// A fixed, non-secret value for tests only; real secrets come from the environment.
process.env.JWT_SECRET = "integration-test-secret-at-least-32-characters";
