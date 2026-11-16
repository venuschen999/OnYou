import { NextResponse } from "next/server";
import { parseInput, readJsonBody, toErrorResponse } from "@/lib/server/http";
import { requestPasswordReset } from "@/lib/server/passwordResetService";
import { passwordResetRequestSchema } from "@/lib/validation/auth";

// Runs on the default Node.js runtime. `cacheComponents` forbids an explicit
// `runtime` export (docs/agent-memory/workflow.md W2).

// auth.md A11: one body for every accepted request, known email or not.
const ACCEPTED_MESSAGE =
  "If an account exists for that email, a reset link is on its way.";
const UNKNOWN_IP = "unknown";

// Vercel puts the client address first in x-forwarded-for (auth.md A10).
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || UNKNOWN_IP;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input = parseInput(
      passwordResetRequestSchema,
      await readJsonBody(request),
    );
    await requestPasswordReset(
      input,
      clientIp(request),
      new Date(),
      process.env,
    );
    return NextResponse.json({ message: ACCEPTED_MESSAGE });
  } catch (error) {
    return toErrorResponse(error);
  }
}
