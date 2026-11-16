import { NextResponse } from "next/server";
import { buildClearedAuthCookie } from "@/lib/server/authToken";
import { parseInput, readJsonBody, toErrorResponse } from "@/lib/server/http";
import { confirmPasswordReset } from "@/lib/server/passwordResetService";
import { passwordResetConfirmSchema } from "@/lib/validation/auth";

// Runs on the default Node.js runtime, which bcrypt (a native module) needs.
// `cacheComponents` forbids an explicit `runtime` export.

const UPDATED_MESSAGE = "Password updated. Log in with your new password.";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = parseInput(
      passwordResetConfirmSchema,
      await readJsonBody(request),
    );
    await confirmPasswordReset(input, new Date());
    // auth.md A15: every session is signed out by tokenVersion; this browser
    // also drops its cookie.
    const response = NextResponse.json({ message: UPDATED_MESSAGE });
    response.cookies.set(buildClearedAuthCookie());
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
