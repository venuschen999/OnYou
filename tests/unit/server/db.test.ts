import { afterAll, describe, expect, it, vi } from "vitest";

type Disconnectable = { $disconnect(): Promise<void> };

const clients = new Set<Disconnectable>();

function clearCachedClient(): void {
  delete (globalThis as { prisma?: unknown }).prisma;
}

async function loadClient(): Promise<Disconnectable> {
  const db = await import("@/lib/server/db");
  clients.add(db.prisma);
  return db.prisma;
}

afterAll(async () => {
  await Promise.all([...clients].map((client) => client.$disconnect()));
  clearCachedClient();
});

describe("prisma client lifetime", () => {
  it("reuses one client after the module is reloaded outside production", async () => {
    clearCachedClient();
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://onyou:onyou@127.0.0.1:5432/onyou_unit",
    );
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();

    const first = await loadClient();
    vi.resetModules();
    const second = await loadClient();

    expect(second).toBe(first);
    vi.unstubAllEnvs();
  });

  it("refuses to create a client when DATABASE_URL is missing", async () => {
    clearCachedClient();
    vi.stubEnv("DATABASE_URL", "   ");
    vi.resetModules();

    await expect(import("@/lib/server/db")).rejects.toThrow(
      "DATABASE_URL must be set before the database client is created",
    );
    vi.unstubAllEnvs();
  });

  it("opens a new client on each import in production", async () => {
    clearCachedClient();
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://onyou:onyou@127.0.0.1:5432/onyou_unit",
    );
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();

    const first = await loadClient();
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const second = await loadClient();

    expect(second).not.toBe(first);
    vi.unstubAllEnvs();
  });
});
