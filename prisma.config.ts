import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Generate does not need a database. Migrate uses DATABASE_URL from the
// environment, and dotenv does not replace a URL the test runner or CI set.
config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
    // Only drift checks need a shadow database. Migrate deploy uses `url`.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
