import type { ReactElement, ReactNode } from "react";

type ErrorMessageProps = {
  id: string;
  children: ReactNode;
  isAlert?: boolean;
};

// AGENTS.md §13: errors are announced politely and referenced by
// aria-describedby. The color is never the only signal; the text is the error.
export function ErrorMessage({
  id,
  children,
  isAlert = false,
}: ErrorMessageProps): ReactElement {
  return (
    <p
      id={id}
      role={isAlert ? "alert" : undefined}
      aria-live="polite"
      className="m-0 text-[0.88rem] font-semibold text-danger"
    >
      {children}
    </p>
  );
}
