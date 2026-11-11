"use client";

import { usePathname } from "next/navigation";
import { ActiveSessionBar } from "@/components/ActiveSessionBar";
import { useSession } from "@/components/SessionPresence";
import { ROUTES } from "@/lib/routes";

// Mockup order is the app header, then this bar, then the page.
export function ActiveSessionNotice() {
  const { session } = useSession();
  const pathname = usePathname();
  if (session?.status !== "ACTIVE" || pathname === ROUTES.focus) return null;
  return <ActiveSessionBar session={session} />;
}
