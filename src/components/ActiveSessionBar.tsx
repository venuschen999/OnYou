"use client";

import Link from "next/link";
import { useCountdown } from "@/hooks/useCountdown";
import { formatEndClock } from "@/lib/domain/countdown";
import type { FocusSessionView } from "@/lib/api/sessions";
import { ROUTES } from "@/lib/routes";

type ActiveSessionBarProps = {
  session: FocusSessionView;
};

export function ActiveSessionBar({ session }: ActiveSessionBarProps) {
  const countdown = useCountdown(session.endTime);
  const endClock = formatEndClock(
    new Date(session.endTime),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  return (
    <div
      className="flex items-center justify-between gap-4 border-b border-line bg-tint px-6 py-3 max-[600px]:flex-col max-[600px]:items-stretch"
      role="status"
    >
      <p className="m-0">
        <b>“{session.taskName}” is running.</b> {countdown.text} left, ends at{" "}
        {endClock}.
      </p>
      <Link
        href={ROUTES.focus}
        className="rounded-[14px] bg-primary px-4 py-2 text-center font-bold text-primary-foreground max-[600px]:w-full"
      >
        Return to session
      </Link>
    </div>
  );
}
