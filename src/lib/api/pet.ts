// Typed browser helpers for /api/pet (AGENTS.md §3).
import type { FeedingState } from "@/lib/domain/rewards";
import { requestJson } from "./sessions";

export type PetProgressView = {
  name: string;
  coins: number;
  applesToday: number;
  feedingMinutesTowardNextApple: number;
  feedingState: FeedingState;
};

export function getPet(): Promise<PetProgressView> {
  return requestJson<PetProgressView>("/api/pet");
}

export function renamePet(name: string): Promise<PetProgressView> {
  return requestJson<PetProgressView>("/api/pet", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
}
