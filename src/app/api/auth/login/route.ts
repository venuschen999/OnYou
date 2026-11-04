import { NextResponse } from "next/server";
import { logIn } from "@/lib/server/authService";
import { buildAuthCookie } from "@/lib/server/authToken";
import { parseInput, readJsonBody, toErrorResponse } from "@/lib/server/http";
import { loginSchema } from "@/lib/validation/auth";

// bcrypt is a native module; Route Handlers run on Node (AGENTS.md §2).
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = parseInput(loginSchema, await readJsonBody(request));
    const { user, token } = await logIn(input, new Date());
    const response = NextResponse.json({ user });
    response.cookies.set(buildAuthCookie(token));
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
