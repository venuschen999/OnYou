import { redirect } from "next/navigation";

// docs/agent-memory/auth.md A8.2: Home lives at /dashboard. The proxy and the
// (app) layout send signed-out visitors on to /login.
export default function RootPage(): never {
  redirect("/dashboard");
}
