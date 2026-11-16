"use client";

import { useEffect, useState, type ReactElement } from "react";
import { DashboardView } from "@/components/DashboardView";
import { useSession } from "@/components/SessionPresence";
import { getPet, type PetProgressView } from "@/lib/api/pet";

type PetLoad =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; pet: PetProgressView };

// Home reads the signed-in pet from GET /api/pet (US4, pet.md P4).
export function HomeDashboard(): ReactElement {
  const { session } = useSession();
  const [petLoad, setPetLoad] = useState<PetLoad>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  // A response that arrives after unmount or a newer attempt is ignored.
  useEffect(() => {
    let isCurrent = true;
    getPet()
      .then((pet) => {
        if (isCurrent) setPetLoad({ status: "ready", pet });
      })
      .catch(() => {
        if (isCurrent) setPetLoad({ status: "error" });
      });
    return () => {
      isCurrent = false;
    };
  }, [attempt]);

  function retry(): void {
    setPetLoad({ status: "loading" });
    setAttempt((count) => count + 1);
  }

  const active = session?.status === "ACTIVE" ? session : null;
  return (
    <DashboardView
      status={petLoad.status}
      pet={petLoad.status === "ready" ? petLoad.pet : null}
      activeSession={active}
      onRetry={retry}
    />
  );
}
