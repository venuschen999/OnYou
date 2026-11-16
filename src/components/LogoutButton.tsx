"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type ReactElement } from "react";
import { useSession } from "@/components/SessionPresence";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Modal } from "@/components/ui/Modal";
import { ApiError, logOut } from "@/lib/api/auth";
import { SERVER_ERROR_MESSAGE } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

// Settings Log out and the "Log out during a session" confirmation
// (OnYou_web_mockups.html; docs/agent-memory/auth.md A17).
export function LogoutButton(): ReactElement {
  const router = useRouter();
  const { session, forgetSession } = useSession();
  const titleId = useId();
  const errorId = useId();
  const logoutRef = useRef<HTMLButtonElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = session?.status === "ACTIVE" ? session : null;

  async function finishLogout(): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsBusy(true);
    setError(null);
    try {
      await logOut();
    } catch (failure) {
      // A 401 means this browser is already signed out; carry on to login.
      if (!(failure instanceof ApiError && failure.status === 401)) {
        setError(SERVER_ERROR_MESSAGE);
        inFlight.current = false;
        setIsBusy(false);
        return;
      }
    }
    forgetSession();
    router.replace(ROUTES.login);
  }

  function startLogout(): void {
    if (running) {
      setIsConfirming(true);
      return;
    }
    void finishLogout();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        ref={logoutRef}
        variant="danger"
        onClick={startLogout}
        disabled={isBusy}
        aria-describedby={error ? errorId : undefined}
      >
        Log out
      </Button>
      <p className="m-0 text-sm text-muted">
        Logging out during a session ends that session.
      </p>
      {error ? (
        <ErrorMessage id={errorId} isAlert>
          {error}
        </ErrorMessage>
      ) : null}
      {isConfirming && running ? (
        <Modal
          titleId={titleId}
          onClose={() => setIsConfirming(false)}
          initialFocusRef={stayRef}
          returnFocusRef={logoutRef}
        >
          <h2 id={titleId} className="m-0 text-xl font-bold">
            Log out and end this session?
          </h2>
          <p className="m-0 text-muted">
            {`“${running.taskName}” is still running. Logging out ends it on every device, and Mochi gets nothing from it.`}
          </p>
          <div className="mt-1.5 flex justify-end gap-3 max-[600px]:flex-col-reverse">
            <Button
              variant="danger"
              onClick={() => void finishLogout()}
              disabled={isBusy}
            >
              Log out and end session
            </Button>
            <Button ref={stayRef} onClick={() => setIsConfirming(false)}>
              Stay logged in
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
