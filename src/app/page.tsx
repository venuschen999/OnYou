import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// docs/agent-memory/auth.md A8.2: Home lives at /dashboard. The proxy and the
// (app) layout send signed-out visitors on to /login.
export default function RootPage(): never {
  redirect(ROUTES.home);
}
