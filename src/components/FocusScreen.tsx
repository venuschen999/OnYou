"use client";

import Link from "next/link";
import { ConnectionWarning } from "@/components/ConnectionWarning";
import { FocusSetup } from "@/components/FocusSetup";
import { FocusTimer } from "@/components/FocusTimer";
import { SessionResult } from "@/components/SessionResult";
import { useSession } from "@/components/SessionPresence";
import { Spinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/lib/routes";

export function FocusScreen() {
  const {
    phase,
    session,
    errorMessage,
    errorCode,
    connectionFailed,
    starting,
    completing,
    start,
    startAnother,
  } = useSession();
  const running = session?.status === "ACTIVE";
  const showResult =
    session?.status === "COMPLETED" || session?.status === "ABANDONED";

  return (
    <div className="flex flex-1 flex-col">
      {connectionFailed ? <ConnectionWarning /> : null}
      {phase === "loading" ? (
        <p aria-busy="true">Loading your session…</p>
      ) : null}
      {completing ? (
        <p aria-busy="true">
          <Spinner className="mr-2" />
          Finishing your session…
        </p>
      ) : null}
      {phase === "ready" && !completing && running && session ? (
        <FocusTimer session={session} />
      ) : null}
      {phase === "ready" && !completing && showResult && session ? (
        <SessionResult session={session} onStartAnother={startAnother} />
      ) : null}
      {phase === "ready" && !completing && !session ? (
        <FocusSetup starting={starting} onStart={start} />
      ) : null}
      {errorMessage ? (
        <p className="mt-4 font-semibold text-danger" role="alert">
          {errorMessage}{" "}
          {errorCode === "UNAUTHENTICATED" ? (
            <Link href={ROUTES.login} className="underline">
              Log in
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
