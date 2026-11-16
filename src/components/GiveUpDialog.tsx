"use client";

import { useId, useRef, type ReactElement, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { giveUpMessage } from "@/lib/domain/giveUp";

type GiveUpDialogProps = {
  elapsedMinutes: number;
  busy: boolean;
  onConfirm: () => void;
  onKeepFocusing: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
};

// US7 Give up confirmation (OnYou_web_mockups.html; sessions.md S11).
export function GiveUpDialog({
  elapsedMinutes,
  busy,
  onConfirm,
  onKeepFocusing,
  returnFocusRef,
}: GiveUpDialogProps): ReactElement {
  const titleId = useId();
  // Opening on the safe choice means a stray Enter keeps the session.
  const keepRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      titleId={titleId}
      onClose={onKeepFocusing}
      initialFocusRef={keepRef}
      returnFocusRef={returnFocusRef}
    >
      <h2 id={titleId} className="m-0 text-xl font-bold">
        Give up this session?
      </h2>
      <p className="m-0 text-muted">{giveUpMessage(elapsedMinutes)}</p>
      <div className="mt-1.5 flex justify-end gap-3 max-[600px]:flex-col-reverse">
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          Give up
        </Button>
        <Button ref={keepRef} onClick={onKeepFocusing}>
          Keep focusing
        </Button>
      </div>
    </Modal>
  );
}
