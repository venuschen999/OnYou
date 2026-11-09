-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(30) NOT NULL DEFAULT 'Mochi',
    "coins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskName" VARCHAR(80) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3) NOT NULL,
    "lastHeartbeatAt" TIMESTAMPTZ(3) NOT NULL,
    "coinsEarned" INTEGER NOT NULL DEFAULT 0,
    "feedingMinutesEarned" INTEGER NOT NULL DEFAULT 0,
    "applesEarned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyFeeding" (
    "petId" TEXT NOT NULL,
    "feedingDay" DATE NOT NULL,
    "feedingMinutes" INTEGER NOT NULL DEFAULT 0,
    "apples" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyFeeding_pkey" PRIMARY KEY ("petId","feedingDay")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pet_userId_key" ON "Pet"("userId");

-- CreateIndex
CREATE INDEX "FocusSession_userId_startTime_idx" ON "FocusSession"("userId", "startTime" DESC);

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyFeeding" ADD CONSTRAINT "DailyFeeding_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constraints Prisma schema cannot express (see prisma/schema.prisma header).

-- PRD v2.9 §5.1: at most one ACTIVE session per account, across tabs and devices.
CREATE UNIQUE INDEX "FocusSession_one_active_per_user" ON "FocusSession"("userId") WHERE "status" = 'ACTIVE';

-- PRD v2.9 §7: email is unique case-insensitively.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User"(LOWER("email"));

-- PRD v2.9 US5: durations are exactly 15, 25, or 50 minutes.
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_durationMinutes_check" CHECK ("durationMinutes" IN (15, 25, 50));
