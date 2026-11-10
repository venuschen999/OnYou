"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ActiveSessionBar } from "@/components/ActiveSessionBar";
import {
  useSessionController,
  type SessionController,
} from "@/hooks/useSessionController";

const SessionContext = createContext<SessionController | null>(null);

export function useSession(): SessionController {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("SessionPresence is required around the focus screen.");
  }
  return value;
}

export function SessionPresence({ children }: { children: ReactNode }) {
  const controller = useSessionController();
  const pathname = usePathname();
  const showBar =
    controller.session?.status === "ACTIVE" && pathname !== "/focus";

  return (
    <SessionContext.Provider value={controller}>
      {showBar && controller.session ? (
        <ActiveSessionBar session={controller.session} />
      ) : null}
      {children}
    </SessionContext.Provider>
  );
}
