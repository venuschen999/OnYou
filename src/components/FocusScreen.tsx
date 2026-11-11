"use client";

import { ConnectionWarning } from "@/components/ConnectionWarning";
import { FocusSetup } from "@/components/FocusSetup";
import { FocusTimer } from "@/components/FocusTimer";
import { useSession } from "@/components/SessionPresence";

export function FocusScreen() {
  const { phase, session, errorMessage, connectionFailed, starting, start } =
    useSession();
  const running = session?.status === "ACTIVE";

  return (
    <div className="flex flex-1 flex-col">
      {connectionFailed ? <ConnectionWarning /> : null}
      {phase === "loading" ? (
        <p aria-busy="true">Loading your session…</p>
      ) : null}
      {phase === "ready" && running && session ? (
        <FocusTimer session={session} />
      ) : null}
      {phase === "ready" && !running ? (
        <FocusSetup starting={starting} onStart={start} />
      ) : null}
      {errorMessage ? (
        <p className="mt-4 font-semibold text-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
