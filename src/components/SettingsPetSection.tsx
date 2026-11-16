"use client";

import { useEffect, useState, type ReactElement } from "react";
import { PetNameForm } from "@/components/PetNameForm";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { getPet } from "@/lib/api/pet";
import { SERVER_ERROR_MESSAGE } from "@/lib/messages";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; name: string };

// Settings Pet group: loads the current name, with loading and error states
// (AGENTS.md §7; pet.md P6).
export function SettingsPetSection(): ReactElement {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const [attempt, setAttempt] = useState(0);

  // State changes only in the request's callbacks; a response that arrives
  // after unmount or a newer attempt is ignored (AGENTS.md §3).
  useEffect(() => {
    let isCurrent = true;
    getPet()
      .then((pet) => {
        if (isCurrent) setState({ status: "ready", name: pet.name });
      })
      .catch(() => {
        if (isCurrent) setState({ status: "error" });
      });
    return () => {
      isCurrent = false;
    };
  }, [attempt]);

  function retry(): void {
    setState({ status: "loading" });
    setAttempt((count) => count + 1);
  }

  if (state.status === "loading") {
    return <p aria-busy="true">Loading your pet…</p>;
  }
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorMessage id="settings-pet-error" isAlert>
          {SERVER_ERROR_MESSAGE}
        </ErrorMessage>
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }
  return <PetNameForm initialName={state.name} />;
}
