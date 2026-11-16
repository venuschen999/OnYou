import { z } from "zod";

// PRD v2.9 §7; docs/agent-memory/pet.md P5.
export const DEFAULT_PET_NAME = "Mochi";
export const PET_NAME_MAX_LENGTH = 30;

// Trims, rejects over-limit names without truncating, and turns a blank
// name back into Mochi (US3).
export const petNameSchema = z
  .string({ error: "Enter a pet name." })
  .trim()
  .superRefine((value, context) => {
    // Count characters, not UTF-16 units, so an emoji counts as one.
    const length = Array.from(value).length;
    if (length <= PET_NAME_MAX_LENGTH) return;
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Pet names can be up to ${PET_NAME_MAX_LENGTH} characters. This one has ${length}.`,
    });
  })
  .transform((value) => (value === "" ? DEFAULT_PET_NAME : value));

export const renamePetSchema = z.object({ name: petNameSchema });

export type RenamePetInput = z.infer<typeof renamePetSchema>;
