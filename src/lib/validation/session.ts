import { z } from "zod";

// PRD v2.9 §7 and US5. Over-limit input is rejected, never truncated.
export const DURATIONS = [15, 25, 50] as const;
export const TASK_NAME_MAX_LENGTH = 80;
export const DEFAULT_TASK_NAME = "Focus session";
export const DURATION_MESSAGE = "Choose 15, 25, or 50 minutes.";

export type DurationMinutes = (typeof DURATIONS)[number];

function taskNameMessage(length: number): string {
  return `Task names can be up to ${TASK_NAME_MAX_LENGTH} characters. This one has ${length}.`;
}

const taskNameSchema = z
  .string({ invalid_type_error: "Task name must be text." })
  .optional()
  .superRefine((value, context) => {
    if (value === undefined) return;
    const length = Array.from(value.trim()).length;
    if (length <= TASK_NAME_MAX_LENGTH) return;
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: taskNameMessage(length),
    });
  })
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed === "" ? DEFAULT_TASK_NAME : trimmed;
  });

const durationSchema = z
  .number({
    required_error: DURATION_MESSAGE,
    invalid_type_error: DURATION_MESSAGE,
  })
  .refine(
    (value): value is DurationMinutes =>
      (DURATIONS as readonly number[]).includes(value),
    { message: DURATION_MESSAGE },
  );

export const startSessionSchema = z.object({
  taskName: taskNameSchema,
  durationMinutes: durationSchema,
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
