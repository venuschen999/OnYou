import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import type { SessionStatus } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildSession, buildUser } from "../factories";
import { TEST_DATABASE_URL, resetTestDatabase, testPrisma } from "./testDb";
import { PRISMA_BIN } from "./testEnv";

const MODEL_TABLES = ["DailyFeeding", "FocusSession", "Pet", "User"];
const UNIQUE_VIOLATION = { code: "P2002" };

type ColumnRow = { table_name: string; column_name: string; data_type: string };

async function listColumns(): Promise<ColumnRow[]> {
  return testPrisma.$queryRaw<ColumnRow[]>`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'`;
}

async function createUserWithPet(email?: string) {
  return testPrisma.user.create({
    data: { ...buildUser(email ? { email } : {}), pet: { create: {} } },
    include: { pet: true },
  });
}

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("first migration (#5)", () => {
  it("applies cleanly and leaves no drift from schema.prisma", async () => {
    const migrations = readdirSync("prisma/migrations", { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    expect(migrations.length).toBeGreaterThan(0);

    const tables = await testPrisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
      ORDER BY table_name`;
    expect(tables.map((row) => row.table_name)).toEqual(MODEL_TABLES);

    // `migrate diff --exit-code` exits non-zero (and execFileSync throws) on drift.
    expect(() =>
      execFileSync(
        PRISMA_BIN,
        [
          "migrate",
          "diff",
          "--from-url",
          TEST_DATABASE_URL,
          "--to-schema-datamodel",
          "prisma/schema.prisma",
          "--exit-code",
        ],
        { stdio: "pipe" },
      ),
    ).not.toThrow();
  });
});

describe("one ACTIVE session per user (PRD v2.9 §5.1)", () => {
  it("rejects a second ACTIVE session for the same user", async () => {
    const user = await createUserWithPet();
    await testPrisma.focusSession.create({ data: buildSession(user.id) });

    await expect(
      testPrisma.focusSession.create({ data: buildSession(user.id) }),
    ).rejects.toMatchObject(UNIQUE_VIOLATION);
  });

  it.each<SessionStatus>(["COMPLETED", "ABANDONED"])(
    "allows a new ACTIVE session once the previous one is %s",
    async (finalStatus) => {
      const user = await createUserWithPet();
      await testPrisma.focusSession.create({
        data: buildSession(user.id, { status: finalStatus }),
      });

      const active = await testPrisma.focusSession.create({
        data: buildSession(user.id),
      });

      expect(active.status).toBe("ACTIVE");
    },
  );

  it("allows different users to each have an ACTIVE session", async () => {
    const first = await createUserWithPet();
    const second = await createUserWithPet();
    await testPrisma.focusSession.create({ data: buildSession(first.id) });

    const active = await testPrisma.focusSession.create({
      data: buildSession(second.id),
    });

    expect(active.status).toBe("ACTIVE");
  });
});

describe("FocusSession columns (PRD v2.9 §10)", () => {
  it("stores server timestamps and status without any completion token", async () => {
    const columns = (await listColumns())
      .filter((row) => row.table_name === "FocusSession")
      .map((row) => row.column_name);

    expect(columns).toEqual(
      expect.arrayContaining([
        "startTime",
        "endTime",
        "lastHeartbeatAt",
        "status",
      ]),
    );
    // Obsolete PRD v2.0 model: no hashed focus-session completion token.
    expect(columns.filter((name) => /token/i.test(name))).toEqual([]);
  });

  it("rejects a duration other than 15, 25, or 50 minutes", async () => {
    const user = await createUserWithPet();

    await expect(
      testPrisma.focusSession.create({
        data: buildSession(user.id, { durationMinutes: 20 }),
      }),
    ).rejects.toThrow(/FocusSession_durationMinutes_check/);
  });
});

describe("timestamps are UTC-compatible", () => {
  it("uses timestamp with time zone for every timestamp column", async () => {
    const timestampTypes = (await listColumns())
      .filter((row) => row.data_type.startsWith("timestamp"))
      .map((row) => row.data_type);

    expect(timestampTypes.length).toBeGreaterThan(0);
    expect(new Set(timestampTypes)).toEqual(
      new Set(["timestamp with time zone"]),
    );
  });

  it("reads back the same UTC instant that was written", async () => {
    const user = await createUserWithPet();
    const startTime = new Date("2026-11-03T23:59:30.123Z");
    const created = await testPrisma.focusSession.create({
      data: buildSession(user.id, { startTime, lastHeartbeatAt: startTime }),
    });

    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: created.id },
    });

    expect(stored.startTime.toISOString()).toBe("2026-11-03T23:59:30.123Z");
  });
});

describe("User and DailyFeeding uniqueness", () => {
  it("rejects an email that differs only in letter case (PRD v2.9 §7)", async () => {
    await createUserWithPet("Mochi.Owner@Example.com");

    await expect(
      createUserWithPet("mochi.owner@example.com"),
    ).rejects.toMatchObject(UNIQUE_VIOLATION);
  });

  it("rejects a second feeding row for the same pet and feeding day", async () => {
    const user = await createUserWithPet();
    const petId = user.pet!.id;
    const feedingDay = new Date("2026-11-03T00:00:00.000Z");
    await testPrisma.dailyFeeding.create({ data: { petId, feedingDay } });

    await expect(
      testPrisma.dailyFeeding.create({ data: { petId, feedingDay } }),
    ).rejects.toMatchObject(UNIQUE_VIOLATION);
  });
});
