"use client";

import type { ReactElement } from "react";
import { Button } from "./ui/Button";

type PageErrorProps = { onRetry: () => void };

// docs/agent-memory/auth.md A8.6 copy. Internal details are never shown
// (AGENTS.md §12).
export function PageError({ onRetry }: PageErrorProps): ReactElement {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p role="alert" className="m-0 font-semibold text-danger">
        Something went wrong. Try again.
      </p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
