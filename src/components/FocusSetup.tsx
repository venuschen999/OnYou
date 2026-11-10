"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DurationPicker } from "@/components/DurationPicker";
import { PetArt } from "@/components/PetArt";
import type { StartInput } from "@/hooks/useSessionController";
import {
  DURATIONS,
  startSessionSchema,
  type DurationMinutes,
} from "@/lib/validation/session";

const KEEP_OPEN =
  "Keep at least one OnYou tab open until the timer ends. Switching tabs or apps is fine. If no OnYou tab is connected for 30 seconds, the session ends without rewards.";

type FocusSetupProps = {
  starting: boolean;
  onStart: (input: StartInput) => void;
};

function taskError(
  taskName: string,
  durationMinutes: DurationMinutes,
): string | undefined {
  const parsed = startSessionSchema.safeParse({ taskName, durationMinutes });
  if (parsed.success) return undefined;
  return parsed.error.issues.find((issue) => issue.path[0] === "taskName")
    ?.message;
}

export function FocusSetup({ starting, onStart }: FocusSetupProps) {
  const [taskName, setTaskName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(
    DURATIONS[1],
  );
  const error = taskError(taskName, durationMinutes);
  const errorId = "task-name-error";

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (error || starting) return;
    onStart({ taskName, durationMinutes });
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl items-center gap-8 max-[600px]:grid-cols-1 min-[601px]:grid-cols-[minmax(0,1fr)_300px]">
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <h1 className="m-0 text-3xl font-extrabold">
          What are you working on?
        </h1>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold" htmlFor="task-name">
            Task
          </label>
          <Input
            id="task-name"
            value={taskName}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : "task-name-hint"}
            onChange={(event) => setTaskName(event.target.value)}
          />
          {error ? (
            <p id={errorId} className="m-0 text-sm font-semibold text-danger">
              {error}
            </p>
          ) : (
            <span id="task-name-hint" className="text-sm text-muted">
              Optional. Up to 80 characters.
            </span>
          )}
        </div>
        <DurationPicker value={durationMinutes} onChange={setDurationMinutes} />
        <p className="m-0 max-w-prose text-muted">{KEEP_OPEN}</p>
        <div>
          <Button type="submit" disabled={Boolean(error) || starting}>
            {`Start ${durationMinutes} minutes`}
          </Button>
        </div>
      </form>
      <aside className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-surface p-7 max-[600px]:hidden">
        <div className="w-40">
          <PetArt label="Mochi is waiting" />
        </div>
        <p className="m-0 text-xl font-bold">Mochi</p>
      </aside>
    </div>
  );
}
