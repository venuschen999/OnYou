import { NextResponse } from "next/server";
import { signUp } from "@/lib/server/authService";
import { buildAuthCookie } from "@/lib/server/authToken";
import { parseInput, readJsonBody, toErrorResponse } from "@/lib/server/http";
import { signupSchema } from "@/lib/validation/auth";

// Runs on the default Node.js runtime, which bcrypt (a native module) needs
// (AGENTS.md §2). `cacheComponents` forbids an explicit `runtime` export.

const HTTP_CREATED = 201;

export async function POST(request: Request): Promise<Response> {
  try {
    const input = parseInput(signupSchema, await readJsonBody(request));
    const { user, token } = await signUp(input, new Date());
    const response = NextResponse.json({ user }, { status: HTTP_CREATED });
    response.cookies.set(buildAuthCookie(token));
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
