"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";

type ModalProps = {
  titleId: string;
  children: ReactNode;
  onClose: () => void;
  // Receives focus when the dialog opens.
  initialFocusRef: RefObject<HTMLElement | null>;
  // Receives focus again when the dialog closes (AGENTS.md §13).
  returnFocusRef: RefObject<HTMLElement | null>;
};

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

// Keeps Tab and Shift+Tab inside the dialog by wrapping at either end.
function trapTab(event: KeyboardEvent, container: HTMLElement): void {
  const focusable = focusableIn(container);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// Mockup .scrim/.dialog: centered card on desktop, bottom sheet on phones
// (AGENTS.md §7). Traps focus and closes with Escape (AGENTS.md §13).
export function Modal({
  titleId,
  children,
  onClose,
  initialFocusRef,
  returnFocusRef,
}: ModalProps): ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initialFocusRef.current?.focus();
    const returnTo = returnFocusRef.current;
    return () => returnTo?.focus();
  }, [initialFocusRef, returnFocusRef]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "Tab" && dialogRef.current) {
      trapTab(event, dialogRef.current);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim max-[600px]:items-end">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="flex w-[460px] max-w-[calc(100%-32px)] flex-col gap-3.5 rounded-3xl border border-line bg-surface p-7 max-[600px]:w-full max-[600px]:max-w-full max-[600px]:rounded-t-[26px] max-[600px]:rounded-b-none max-[600px]:border-x-0 max-[600px]:border-b-0 max-[600px]:p-[22px]"
      >
        {children}
      </div>
    </div>
  );
}
