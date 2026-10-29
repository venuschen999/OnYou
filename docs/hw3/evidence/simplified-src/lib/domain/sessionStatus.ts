export const SessionStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  ABANDONED: "ABANDONED",
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];
