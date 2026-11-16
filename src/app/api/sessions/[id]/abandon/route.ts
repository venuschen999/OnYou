import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { toErrorResponse } from "@/lib/server/http";
import { abandonSession } from "@/lib/server/sessionService";

// Runs on the default Node.js runtime. `cacheComponents` forbids an explicit
// `runtime` export (docs/agent-memory/workflow.md W2).
// US7: any authenticated tab of the owner may give up. The body is ignored,
// and no tab-scoped token is involved (AGENTS.md §8).

type AbandonContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: AbandonContext,
): Promise<Response> {
  try {
    const now = new Date();
    const user = await getAuthenticatedUser(request, now);
    const { id } = await context.params;
    const session = await abandonSession(user.id, id, now);
    return NextResponse.json(session);
  } catch (error) {
    return toErrorResponse(error);
  }
}
