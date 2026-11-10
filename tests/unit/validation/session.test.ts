import { describe, expect, it } from "vitest";
import { startSessionSchema } from "@/lib/validation/session";

const DURATION_MESSAGE = "Choose 15, 25, or 50 minutes.";
const TASK_LIMIT_MESSAGE = (length: number) =>
  `Task names can be up to 80 characters. This one has ${length}.`;

function taskIssue(taskName: string): string | undefined {
  const result = startSessionSchema.safeParse({
    taskName,
    durationMinutes: 25,
  });
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === "taskName")
    ?.message;
}

describe("startSessionSchema duration (PRD v2.9 §7, US5, #12)", () => {
  it.each([15, 25, 50])("accepts %i minutes", (durationMinutes) => {
    const result = startSessionSchema.safeParse({ durationMinutes });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        taskName: "Focus session",
        durationMinutes,
      });
    }
  });

  it.each([0, 10, 20, 30, 15.5, -25])(
    "rejects %s minutes",
    (durationMinutes) => {
      const result = startSessionSchema.safeParse({ durationMinutes });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(DURATION_MESSAGE);
      }
    },
  );

  it.each([undefined, "25", null])("rejects duration %s", (durationMinutes) => {
    const result = startSessionSchema.safeParse(
      durationMinutes === undefined ? {} : { durationMinutes },
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(DURATION_MESSAGE);
    }
  });
});

describe("startSessionSchema task name (PRD v2.9 §7, #12)", () => {
  it("trims the task name", () => {
    const result = startSessionSchema.parse({
      taskName: "  Essay draft  ",
      durationMinutes: 25,
    });
    expect(result.taskName).toBe("Essay draft");
  });

  it.each(["", "   ", undefined])(
    "uses Focus session when the task is blank (%s)",
    (taskName) => {
      const input =
        taskName === undefined
          ? { durationMinutes: 15 }
          : { taskName, durationMinutes: 15 };
      const result = startSessionSchema.parse(input);
      expect(result.taskName).toBe("Focus session");
    },
  );

  it("accepts a task of exactly 80 characters", () => {
    const taskName = `${"a".repeat(79)}🍎`;
    expect(Array.from(taskName).length).toBe(80);

    const result = startSessionSchema.safeParse({
      taskName,
      durationMinutes: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.taskName).toBe(taskName);
  });

  it("rejects a task over 80 characters instead of truncating it", () => {
    const taskName = "a".repeat(81);
    const result = startSessionSchema.safeParse({
      taskName,
      durationMinutes: 25,
    });

    expect(result.success).toBe(false);
    expect(taskIssue(taskName)).toBe(TASK_LIMIT_MESSAGE(81));
  });

  it("rejects a non-text task name", () => {
    const result = startSessionSchema.safeParse({
      taskName: 25,
      durationMinutes: 25,
    });
    expect(result.success).toBe(false);
  });

  it("drops unknown fields, including a completion token", () => {
    const result = startSessionSchema.parse({
      durationMinutes: 15,
      sessionToken: "tab-secret",
      token: "tab-secret",
    });
    expect(result).toEqual({ taskName: "Focus session", durationMinutes: 15 });
  });
});
