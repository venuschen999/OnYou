import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/http";
import { completeSession } from "@/lib/server/sessionService";

// Runs on the default Node.js runtime. `cacheComponents` forbids an explicit
// `runtime` export (docs/agent-memory/workflow.md W2).
// The body is ignored: rewards are computed on the server (PRD v2.9 §6, §10).

type CompleteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: CompleteContext,
): Promise<Response> {
  try {
    const now = new Date();
    const user = await getAuthenticatedUser(request, now);
    const { id } = await context.params;
    const session = await completeSession(user.id, id, now);
    return NextResponse.json(session);
  } catch (error) {
    return toErrorResponse(error);
  }
}
