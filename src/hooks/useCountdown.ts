"use client";

import { useEffect, useState } from "react";
import {
  COUNTDOWN_TICK_MS,
  formatCountdown,
  formatCountdownAnnouncement,
  remainingMilliseconds,
} from "@/lib/domain/countdown";

const MS_PER_MINUTE = 60_000;

export type CountdownView = {
  text: string;
  label: string;
  minutesLeft: number;
  remainingMs: number;
};

export function useCountdown(endTime: string | null): CountdownView {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endTime) return undefined;
    const timer = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, [endTime]);

  const remaining = endTime
    ? remainingMilliseconds(new Date(endTime), new Date(now))
    : 0;
  const minutesLeft = Math.ceil(remaining / MS_PER_MINUTE);
  return {
    text: formatCountdown(remaining),
    label: formatCountdownAnnouncement(remaining),
    minutesLeft,
    remainingMs: remaining,
  };
}
