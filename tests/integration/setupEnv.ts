import { requireTestDatabaseUrl } from "./testEnv";

// Runs before each test file's imports, so `src/lib/server/db.ts` connects to
// the test database, never the development one.
const testDatabaseUrl = requireTestDatabaseUrl();
// The test database is not pooled. Schema commands still read directUrl.
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DATABASE_URL_UNPOOLED = testDatabaseUrl;

// A fixed, non-secret value for tests only; real secrets come from the environment.
process.env.JWT_SECRET = "integration-test-secret-at-least-32-characters";
