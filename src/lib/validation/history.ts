import { z } from "zod";
import { HISTORY_PAGE_SIZE } from "@/lib/domain/history";

export const HISTORY_LIMIT_MESSAGE = "History pages contain 20 sessions.";

const historyLimitSchema = z
  .string()
  .optional()
  .superRefine((value, context) => {
    if (value === undefined || value === String(HISTORY_PAGE_SIZE)) return;
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: HISTORY_LIMIT_MESSAGE,
    });
  })
  .transform(() => HISTORY_PAGE_SIZE);

const historyCursorSchema = z.string().trim().min(1).optional();

export const historyQuerySchema = z
  .object({
    cursor: historyCursorSchema,
    limit: historyLimitSchema,
  })
  .transform((query) => {
    if (query.cursor === undefined) return { limit: query.limit };
    return query;
  });

export type HistoryQuery = z.infer<typeof historyQuerySchema>;
