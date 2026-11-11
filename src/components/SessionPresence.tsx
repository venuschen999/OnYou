"use client";

import { createContext, useContext, type ReactNode } from "react";
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

// Root layout owns this provider so heartbeats survive navigation between
// Home, Focus, History, and Settings (AGENTS.md §3).
export function SessionPresence({ children }: { children: ReactNode }) {
  const controller = useSessionController();
  return (
    <SessionContext.Provider value={controller}>
      {children}
    </SessionContext.Provider>
  );
}
