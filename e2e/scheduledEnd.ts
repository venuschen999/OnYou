import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Far enough behind the server clock that a one-second skew still counts as
// reached, and close enough that the stored start stays a real session.
const SCHEDULED_END_OFFSET_MS = 5_000;

// The server completes a session only when its clock is at or past the stored
// endTime and the presence deadline is strictly later (PRD v2.9 §5.3). The
// browser clock cannot move that decision. These tests pull the stored end
// to a few seconds ago and refresh lastHeartbeatAt so the 30-second presence
// deadline stays strictly later. The next Focus load then completes for real.
export async function reachScheduledEnd(taskName: string): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set before an e2e test moves a session's scheduled end",
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  try {
    const now = new Date();
    const updated = await prisma.focusSession.updateMany({
      where: { taskName, status: "ACTIVE" },
      data: {
        endTime: new Date(now.getTime() - SCHEDULED_END_OFFSET_MS),
        lastHeartbeatAt: now,
      },
    });
    if (updated.count !== 1) {
      throw new Error(
        `Expected one active session named ${taskName}, found ${updated.count}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
