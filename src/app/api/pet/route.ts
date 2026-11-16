import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/http";
import { getPetProgress } from "@/lib/server/petService";

// Runs on the default Node.js runtime. `cacheComponents` forbids an explicit
// `runtime` export (docs/agent-memory/workflow.md W2).
// US4: the signed-in account's pet and today's feeding progress (pet.md P4).
// Renaming (PATCH) is #10.

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
