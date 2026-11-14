"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  completeSession,
  getActiveSession,
  startSession,
  type FocusSessionView,
} from "@/lib/api/sessions";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import {
  abandonedSession,
  classifyCompletionFailure,
  completionDelay,
  completionRetryDelay,
} from "@/hooks/sessionCompletion";

export type StartInput = {
  taskName: string;
  durationMinutes: number;
};

export type SessionController = {
  phase: "loading" | "ready";
  session: FocusSessionView | null;
  errorMessage: string | null;
  errorCode: string | null;
  connectionFailed: boolean;
  starting: boolean;
  completing: boolean;
  start: (input: StartInput) => void;
  startAnother: () => void;
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
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const startingRef = useRef(false);
  const completionEpoch = useRef(0);
  const lockRef = useRef(false);
  const haltRef = useRef(false);
  const terminalIdRef = useRef<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runCompletionRef = useRef<
    (sessionId: string, endTime: string) => Promise<void>
  >(async () => undefined);

  const held = useCallback((): boolean => {
    return terminalIdRef.current !== null || lockRef.current || haltRef.current;
  }, []);

  const applyActive = useCallback(
    (next: FocusSessionView | null) => {
      setConnectionFailed(false);
      if (held()) return;
      if (next?.status === "ACTIVE") {
        setSession(next);
        setErrorMessage(null);
        setErrorCode(null);
        return;
      }
      setSession(null);
      if (next) setErrorMessage("This session is no longer active.");
    },
    [held],
  );

  const reportFailure = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setConnectionFailed(false);
      setErrorCode(error.code);
      setErrorMessage(error.message);
      return;
    }
    if (error instanceof ApiError && error.status < 500) {
      setConnectionFailed(false);
      setErrorCode(error.code);
      setErrorMessage(error.message);
      return;
    }
    setConnectionFailed(true);
  }, []);

  const begin = useCallback(() => {
    epoch.current += 1;
    return epoch.current;
  }, []);

  const clearRetry = useCallback(() => {
    if (!retryTimerRef.current) return;
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  }, []);

  const invalidateCompletion = useCallback(() => {
    completionEpoch.current += 1;
    lockRef.current = false;
    haltRef.current = false;
    terminalIdRef.current = null;
    clearRetry();
    setCompleting(false);
  }, [clearRetry]);

  const scheduleRetry = useCallback(
    (sessionId: string, endTime: string) => {
      clearRetry();
      const delay = completionRetryDelay(endTime, Date.now());
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        if (!mounted.current) return;
        void runCompletionRef.current(sessionId, endTime);
      }, delay);
    },
    [clearRetry],
  );

  const applyCompletionFailure = useCallback(
    (error: unknown, sessionId: string, endTime: string): boolean => {
      const failure = classifyCompletionFailure(error);
      if (failure.type === "retry") {
        scheduleRetry(sessionId, endTime);
        return true;
      }
      if (failure.type === "abandoned") {
        terminalIdRef.current = sessionId;
        setSession((current) =>
          current?.id === sessionId ? abandonedSession(current) : current,
        );
        setErrorMessage(null);
        setErrorCode(null);
        setConnectionFailed(false);
        return false;
      }
      if (failure.type === "terminal") {
        haltRef.current = true;
        setErrorCode(failure.code);
        setErrorMessage(failure.message);
        setConnectionFailed(false);
        if (failure.status === 403 || failure.status === 404) {
          setSession((current) => (current?.id === sessionId ? null : current));
        }
        return false;
      }
      reportFailure(error);
      scheduleRetry(sessionId, endTime);
      return true;
    },
    [reportFailure, scheduleRetry],
  );

  const runCompletion = useCallback(
    async (sessionId: string, endTime: string): Promise<void> => {
      if (haltRef.current || lockRef.current) return;
      if (terminalIdRef.current === sessionId) return;
      lockRef.current = true;
      setCompleting(true);
      const requestEpoch = ++completionEpoch.current;
      let keepFinishing = false;
      try {
        const completed = await completeSession(sessionId);
        if (!isCurrent(completionEpoch, mounted, requestEpoch)) return;
        if (completed.status !== "COMPLETED") return;
        terminalIdRef.current = completed.id;
        setSession(completed);
        setErrorMessage(null);
        setErrorCode(null);
        setConnectionFailed(false);
      } catch (error) {
        if (!isCurrent(completionEpoch, mounted, requestEpoch)) return;
        keepFinishing = applyCompletionFailure(error, sessionId, endTime);
      } finally {
        lockRef.current = false;
        if (
          isCurrent(completionEpoch, mounted, requestEpoch) &&
          !keepFinishing
        ) {
          setCompleting(false);
        }
      }
    },
    [applyCompletionFailure],
  );

  useEffect(() => {
    runCompletionRef.current = runCompletion;
  }, [runCompletion]);

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
      completionEpoch.current += 1;
      clearRetry();
    };
  }, [applyActive, begin, clearRetry, reportFailure]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  useEffect(() => {
    if (haltRef.current) return undefined;
    if (!session || session.status !== "ACTIVE") return undefined;
    const sessionId = session.id;
    const endTime = session.endTime;
    const delay = completionDelay(endTime, Date.now());
    const timer = setTimeout(() => {
      void runCompletionRef.current(sessionId, endTime);
    }, delay);
    return () => clearTimeout(timer);
  }, [session]);

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
      invalidateCompletion();
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
    [applyActive, begin, invalidateCompletion, joinExisting, reportFailure],
  );

  const startAnother = useCallback(() => {
    invalidateCompletion();
    setSession(null);
    setErrorMessage(null);
    setErrorCode(null);
    setConnectionFailed(false);
  }, [invalidateCompletion]);

  const acceptHeartbeat = useCallback((next: FocusSessionView) => {
    if (haltRef.current || terminalIdRef.current === next.id) return;
    if (next.status !== "ACTIVE") {
      void runCompletionRef.current(next.id, next.endTime);
      return;
    }
    if (lockRef.current) return;
    setConnectionFailed(false);
    setSession(next);
  }, []);

  const sessionId = session?.status === "ACTIVE" ? session.id : null;
  useHeartbeat(sessionId, acceptHeartbeat, reportFailure);

  return {
    phase,
    session,
    errorMessage,
    errorCode,
    connectionFailed,
    starting,
    completing,
    start,
    startAnother,
  };
}
