import type { ReactElement } from "react";

type SpinnerProps = { className?: string };

// Decorative; the surrounding text ("Logging in…", "Loading…") is what screen
// readers announce. Spinning stops under prefers-reduced-motion (AGENTS.md §13).
export function Spinner({ className = "" }: SpinnerProps): ReactElement {
  return (
    <span
      data-testid="spinner"
      aria-hidden="true"
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px] motion-reduce:animate-none ${className}`}
    />
  );
}
