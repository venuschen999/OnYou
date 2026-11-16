import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { parseInput, readJsonBody, toErrorResponse } from "@/lib/server/http";
import { getPetProgress, renamePet } from "@/lib/server/petService";
import { renamePetSchema } from "@/lib/validation/pet";

// Runs on the default Node.js runtime. `cacheComponents` forbids an explicit
// `runtime` export (docs/agent-memory/workflow.md W2).
// US4: the signed-in account's pet and today's feeding progress (pet.md P4).

export async function GET(request: Request): Promise<Response> {
  try {
    const now = new Date();
    const user = await getAuthenticatedUser(request, now);
    const progress = await getPetProgress(user.id, now);
    return NextResponse.json(progress);
  } catch (error) {
    return toErrorResponse(error);
  }
}

// US3 / pet.md P5: rename the signed-in account's pet.
export async function PATCH(request: Request): Promise<Response> {
  try {
    const now = new Date();
    const user = await getAuthenticatedUser(request, now);
    const input = parseInput(renamePetSchema, await readJsonBody(request));
    const progress = await renamePet(user.id, input.name, now);
    return NextResponse.json(progress);
  } catch (error) {
    return toErrorResponse(error);
  }
}
