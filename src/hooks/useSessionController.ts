"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  getActiveSession,
  startSession,
  type FocusSessionView,
} from "@/lib/api/sessions";
import { useHeartbeat } from "@/hooks/useHeartbeat";

export type StartInput = {
  taskName: string;
  durationMinutes: number;
};

export type SessionController = {
  phase: "loading" | "ready";
  session: FocusSessionView | null;
  errorMessage: string | null;
  connectionFailed: boolean;
  starting: boolean;
  start: (input: StartInput) => void;
};

function isCurrent(
  epoch: { current: number },
  mounted: { current: boolean },
  requestEpoch: number,
): boolean {
  return mounted.current && requestEpoch === epoch.current;
}

export function useSessionController(): SessionController {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [session, setSession] = useState<FocusSessionView | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [starting, setStarting] = useState(false);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const startingRef = useRef(false);

  const applyActive = useCallback((next: FocusSessionView | null) => {
    setConnectionFailed(false);
    if (next?.status === "ACTIVE") {
      setSession(next);
      setErrorMessage(null);
      return;
    }
    setSession(null);
    if (next) setErrorMessage("This session is no longer active.");
  }, []);

  const reportFailure = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setConnectionFailed(false);
      setErrorMessage(error.message);
      return;
    }
    if (error instanceof ApiError && error.status < 500) {
      setConnectionFailed(false);
      setErrorMessage(error.message);
      return;
    }
    setConnectionFailed(true);
  }, []);

  const begin = useCallback(() => {
    epoch.current += 1;
    return epoch.current;
  }, []);

  const refresh = useCallback(async () => {
    const requestEpoch = begin();
    try {
      const next = await getActiveSession();
      if (!isCurrent(epoch, mounted, requestEpoch)) return;
      applyActive(next);
    } catch (error) {
      if (!isCurrent(epoch, mounted, requestEpoch)) return;
      reportFailure(error);
    } finally {
      if (isCurrent(epoch, mounted, requestEpoch)) setPhase("ready");
    }
  }, [applyActive, begin, reportFailure]);

  useEffect(() => {
    mounted.current = true;
    const requestEpoch = begin();
    void getActiveSession()
      .then((next) => {
        if (!isCurrent(epoch, mounted, requestEpoch)) return;
        applyActive(next);
        setPhase("ready");
      })
      .catch((error: unknown) => {
        if (!isCurrent(epoch, mounted, requestEpoch)) return;
        reportFailure(error);
        setPhase("ready");
      });
    return () => {
      mounted.current = false;
      epoch.current += 1;
    };
  }, [applyActive, begin, reportFailure]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const joinExisting = useCallback(
    async (message: string) => {
      const requestEpoch = begin();
      try {
        const existing = await getActiveSession();
        if (!isCurrent(epoch, mounted, requestEpoch)) return;
        applyActive(existing);
        if (existing?.status !== "ACTIVE") setErrorMessage(message);
      } catch (error) {
        if (!isCurrent(epoch, mounted, requestEpoch)) return;
        reportFailure(error);
        setErrorMessage(message);
      }
    },
    [applyActive, begin, reportFailure],
  );

  const start = useCallback(
    (input: StartInput) => {
      if (startingRef.current) return;
      startingRef.current = true;
      setStarting(true);
      void beginStart();

      async function beginStart(): Promise<void> {
        const requestEpoch = begin();
        try {
          const created = await startSession(input);
          if (!isCurrent(epoch, mounted, requestEpoch)) return;
          applyActive(created);
        } catch (error) {
          if (!isCurrent(epoch, mounted, requestEpoch)) return;
          if (error instanceof ApiError && error.status === 409) {
            await joinExisting(error.message);
            return;
          }
          reportFailure(error);
        } finally {
          startingRef.current = false;
          if (mounted.current) setStarting(false);
        }
      }
    },
    [applyActive, begin, joinExisting, reportFailure],
  );

  const sessionId = session?.status === "ACTIVE" ? session.id : null;
  useHeartbeat(sessionId, applyActive, reportFailure);

  return {
    phase,
    session,
    errorMessage,
    connectionFailed,
    starting,
    start,
  };
}
