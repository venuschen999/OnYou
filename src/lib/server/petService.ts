import { getFeedingDay } from "@/lib/domain/feedingDay";
import { buildPetProgress, type PetProgress } from "@/lib/domain/petProgress";
import { SERVER_ERROR_MESSAGE } from "@/lib/messages";
import { prisma } from "./db";
import { AppError } from "./errors";
import { feedingDayDate } from "./feedingDayDate";

// docs/agent-memory/pet.md P4: a read-only snapshot. "Today" is now in the
// account's saved timezone; a day with no feeding row is the daily reset.
export async function getPetProgress(
  userId: string,
  now: Date,
): Promise<PetProgress> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, pet: true },
  });
  // Signup creates the pet with the account (pet.md P1), so this is a fault.
  if (!user?.pet) throw new AppError("INTERNAL_ERROR", SERVER_ERROR_MESSAGE);

  const today = feedingDayDate(getFeedingDay(now, user.timezone));
  const feeding = await prisma.dailyFeeding.findUnique({
    where: { petId_feedingDay: { petId: user.pet.id, feedingDay: today } },
  });
  return buildPetProgress({
    name: user.pet.name,
    coins: user.pet.coins,
    feedingMinutes: feeding?.feedingMinutes ?? 0,
    apples: feeding?.apples ?? 0,
  });
}

// pet.md P5: the name arrives already trimmed and defaulted by
// renamePetSchema; the response is the same snapshot GET returns.
export async function renamePet(
  userId: string,
  name: string,
  now: Date,
): Promise<PetProgress> {
  await prisma.pet.update({ where: { userId }, data: { name } });
  return getPetProgress(userId, now);
}
