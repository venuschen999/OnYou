import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/http";
import { heartbeatSession } from "@/lib/server/sessionService";

// Runs on the default Node.js runtime. `cacheComponents` forbids an explicit
// `runtime` export (docs/agent-memory/workflow.md W2).
// The body is ignored: timestamps and rewards come from the server (PRD v2.9 §10).

type HeartbeatContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: HeartbeatContext,
): Promise<Response> {
  try {
    const now = new Date();
    const user = await getAuthenticatedUser(request, now);
    const { id } = await context.params;
    const session = await heartbeatSession(user.id, id, now);
    return NextResponse.json(session);
  } catch (error) {
    return toErrorResponse(error);
  }
}
