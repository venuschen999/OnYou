"use client";

import type { ReactElement } from "react";
import {
  DashboardView,
  type DashboardStatus,
} from "@/components/DashboardView";
import { useSession } from "@/components/SessionPresence";
import type { PetProgress } from "@/lib/domain/dashboard";

type HomeDashboardProps = {
  // Tests pass a fixture. The page does not: GET /api/pet is issue #19.
  pet?: PetProgress | null;
  status?: DashboardStatus;
  onRetry?: () => void;
};

// TODO(#19): load the account pet from GET /api/pet once that endpoint and
// its response body exist. Do not call a stand-in route.
function blockedRetry(): void {
  return undefined;
}

export function HomeDashboard({
  pet = null,
  status = "error",
  onRetry,
}: HomeDashboardProps): ReactElement {
  const { session } = useSession();
  const active = session?.status === "ACTIVE" ? session : null;
  const viewStatus = status === "ready" && !pet ? "error" : status;
  return (
    <DashboardView
      status={viewStatus}
      pet={pet}
      activeSession={active}
      onRetry={onRetry ?? blockedRetry}
    />
  );
}
