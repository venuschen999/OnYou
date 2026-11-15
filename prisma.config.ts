import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { migrationDatabaseUrl } from "./src/lib/server/migrationDatabaseUrl";

// Generate does not need a database. Migrate prefers DATABASE_URL_UNPOOLED
// and otherwise uses DATABASE_URL. dotenv does not replace a URL the test
// runner or CI already set.
config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationDatabaseUrl(process.env),
    // Only drift checks need a shadow database. Migrate deploy uses `url`.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
