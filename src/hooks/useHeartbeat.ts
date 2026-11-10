"use client";

import { useEffect } from "react";
import { heartbeatSession, type FocusSessionView } from "@/lib/api/sessions";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/domain/presence";

// Lives with the app shell so a tab keeps heartbeating after the Focus screen
// unmounts (PRD v2.9 §10). One in-flight request per tab; a late response
// cannot overwrite a newer session.
export function useHeartbeat(
  sessionId: string | null,
  onResult: (session: FocusSessionView) => void,
  onFailure: (error: unknown) => void,
): void {
  useEffect(() => {
    if (!sessionId) return undefined;
    const currentId = sessionId;
    const epoch = { current: 0 };
    const inFlight = { current: 0 };

    const send = () => {
      if (inFlight.current !== 0) return;
      epoch.current += 1;
      const requestEpoch = epoch.current;
      inFlight.current = requestEpoch;
      void heartbeatSession(currentId)
        .then((next) => {
          if (requestEpoch !== epoch.current || next.id !== currentId) return;
          onResult(next);
        })
        .catch((error: unknown) => {
          if (requestEpoch !== epoch.current) return;
          onFailure(error);
        })
        .finally(() => {
          if (inFlight.current === requestEpoch) inFlight.current = 0;
        });
    };

    send();
    const timer = setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      epoch.current += 1;
      inFlight.current = 0;
    };
  }, [onFailure, onResult, sessionId]);
}
