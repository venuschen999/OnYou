import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/http";
import { getActiveSession } from "@/lib/server/sessionService";

// Runs on the default Node.js runtime. `cacheComponents` forbids an explicit
// `runtime` export (docs/agent-memory/workflow.md W2).
// Any authenticated tab joins the account's Active session (PRD v2.9 US5).

export async function GET(request: Request): Promise<Response> {
  try {
    const now = new Date();
    const user = await getAuthenticatedUser(request, now);
    const session = await getActiveSession(user.id, now);
    return NextResponse.json(session);
  } catch (error) {
    return toErrorResponse(error);
  }
}
