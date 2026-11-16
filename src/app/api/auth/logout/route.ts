import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { buildClearedAuthCookie } from "@/lib/server/authToken";
import { toErrorResponse } from "@/lib/server/http";
import { endActiveSessionOnLogout } from "@/lib/server/sessionService";

// Runs on the default Node.js runtime. `cacheComponents` forbids an explicit
// `runtime` export (docs/agent-memory/workflow.md W2).
// US1 / auth.md A17: end the Active session on every device, then sign this
// browser out. No tab-scoped token is read or cleared (AGENTS.md §8).

const LOGGED_OUT_MESSAGE = "Logged out.";

export async function POST(request: Request): Promise<Response> {
  try {
    const now = new Date();
    const user = await getAuthenticatedUser(request, now);
    await endActiveSessionOnLogout(user.id, now);
    const response = NextResponse.json({ message: LOGGED_OUT_MESSAGE });
    response.cookies.set(buildClearedAuthCookie());
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
