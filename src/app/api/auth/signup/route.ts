import { NextResponse } from "next/server";
import { signUp } from "@/lib/server/authService";
import { buildAuthCookie } from "@/lib/server/authToken";
import { parseInput, readJsonBody, toErrorResponse } from "@/lib/server/http";
import { signupSchema } from "@/lib/validation/auth";

// bcrypt is a native module; Route Handlers run on Node (AGENTS.md §2).
export const runtime = "nodejs";

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
