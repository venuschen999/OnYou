// Prisma 7 has no directUrl field. Migrate deploy reads datasource.url.
// Neon on Vercel sets DATABASE_URL to the pooled host and
// DATABASE_URL_UNPOOLED to the direct host. Local and CI databases are
// already direct, so they set DATABASE_URL only.
export function migrationDatabaseUrl(env: {
  DATABASE_URL?: string;
  DATABASE_URL_UNPOOLED?: string;
  [name: string]: string | undefined;
}): string | undefined {
  const direct = env.DATABASE_URL_UNPOOLED?.trim();
  if (direct) {
    return direct;
  }

  const application = env.DATABASE_URL?.trim();
  if (application) {
    return application;
  }

  return undefined;
}
