import type { InputHTMLAttributes, ReactElement, ReactNode } from "react";
import { ErrorMessage } from "./ErrorMessage";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: ReactNode;
  // Ids of messages outside this field that also describe it (e.g. a form error).
  describedBy?: string[];
  isInvalid?: boolean;
};

// Mockup .field: visible label, optional hint, inline error (AGENTS.md §13).
export function Input({
  id,
  label,
  hint,
  error,
  describedBy = [],
  isInvalid = false,
  ...props
}: InputProps): ReactElement {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const descriptionIds = [
    hint ? hintId : null,
    error ? errorId : null,
    ...describedBy,
  ].filter(Boolean);
  const hasError = Boolean(error) || isInvalid;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.92rem] font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={hasError ? true : undefined}
        aria-describedby={descriptionIds.join(" ") || undefined}
        className="rounded-xl border-[1.5px] border-line bg-surface px-3 py-[11px] text-base aria-invalid:border-danger sm:text-[0.95rem]"
        {...props}
      />
      {hint && (
        <span id={hintId} className="text-[0.84rem] text-muted">
          {hint}
        </span>
      )}
      {error && <ErrorMessage id={errorId}>{error}</ErrorMessage>}
    </div>
  );
}
