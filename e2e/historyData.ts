import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { HISTORY_PAGE_SIZE } from "../src/lib/domain/history";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60_000;
const DURATION_MINUTES = 25;

export { HISTORY_PAGE_SIZE };

export type SeededHistory = {
  newestTaskName: string;
  oldestTaskName: string;
  oldestStartedAt: Date;
};

function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL must be set before an e2e test writes isolated history rows",
    );
  }
  return url;
}

// Isolated rows for this account only. One extra row past HISTORY_PAGE_SIZE
// so Load more has a second page (US8, #26).
export async function seedOwnedHistoryPage(
  email: string,
  taskPrefix: string,
  now: Date,
): Promise<SeededHistory> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl() }),
  });
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      throw new Error(`Expected a signed-up account for ${email}`);
    }
    const total = HISTORY_PAGE_SIZE + 1;
    const rows = Array.from({ length: total }, (_, index) => {
      const startTime = new Date(now.getTime() - index * MS_PER_DAY);
      return {
        userId: user.id,
        taskName: `${taskPrefix} ${String(index + 1).padStart(2, "0")}`,
        durationMinutes: DURATION_MINUTES,
        status: "COMPLETED" as const,
        startTime,
        endTime: new Date(
          startTime.getTime() + DURATION_MINUTES * MS_PER_MINUTE,
        ),
        lastHeartbeatAt: startTime,
        coinsEarned: DURATION_MINUTES,
        feedingMinutesEarned: DURATION_MINUTES,
        applesEarned: 0,
      };
    });
    await prisma.focusSession.createMany({ data: rows });
    const newest = rows[0];
    const oldest = rows[total - 1];
    if (!newest || !oldest) {
      throw new Error("History seed did not build a first and last row");
    }
    return {
      newestTaskName: newest.taskName,
      oldestTaskName: oldest.taskName,
      oldestStartedAt: oldest.startTime,
    };
  } finally {
    await prisma.$disconnect();
  }
}
