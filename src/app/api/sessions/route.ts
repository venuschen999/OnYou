import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { parseInput, readJsonBody, toErrorResponse } from "@/lib/server/http";
import { startSession } from "@/lib/server/sessionService";
import { startSessionSchema } from "@/lib/validation/session";

// Runs on the default Node.js runtime. `cacheComponents` forbids an explicit
// `runtime` export (docs/agent-memory/workflow.md W2).

const HTTP_CREATED = 201;

export async function POST(request: Request): Promise<Response> {
  try {
    const now = new Date();
    const user = await getAuthenticatedUser(request, now);
    const input = parseInput(startSessionSchema, await readJsonBody(request));
    const session = await startSession(user.id, input, now);
    return NextResponse.json(session, { status: HTTP_CREATED });
  } catch (error) {
    return toErrorResponse(error);
  }
}
