import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { parseInput, readJsonBody, toErrorResponse } from "@/lib/server/http";
import { listSessionHistory, startSession } from "@/lib/server/sessionService";
import { historyQuerySchema } from "@/lib/validation/history";
import { startSessionSchema } from "@/lib/validation/session";

// Runs on the default Node.js runtime. `cacheComponents` forbids an explicit
// `runtime` export (docs/agent-memory/workflow.md W2).

const HTTP_CREATED = 201;

function historyQuery(request: Request): {
  cursor?: string;
  limit?: string;
} {
  const params = new URL(request.url).searchParams;
  const cursor = params.get("cursor");
  const limit = params.get("limit");
  return {
    ...(cursor === null ? {} : { cursor }),
    ...(limit === null ? {} : { limit }),
  };
}

// US8: Completed and Abandoned sessions only, newest first, 20 per page.
export async function GET(request: Request): Promise<Response> {
  try {
    const now = new Date();
    const user = await getAuthenticatedUser(request, now);
    const query = parseInput(historyQuerySchema, historyQuery(request));
    const page = await listSessionHistory(user.id, query, now);
    return NextResponse.json(page);
  } catch (error) {
    return toErrorResponse(error);
  }
}

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
