import type { ReactElement } from "react";
import { Spinner } from "./ui/Spinner";

export function PageLoading(): ReactElement {
  return (
    <div
      role="status"
      className="flex flex-1 items-center justify-center gap-2 p-6 text-muted"
    >
      <Spinner /> Loading…
    </div>
  );
}
