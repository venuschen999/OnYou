"use client";

import { DashboardError } from "@/components/DashboardView";

type DashboardErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Next.js always passes `error`. The screen shows the mockup message so a
// digest or internal detail is not rendered (AGENTS.md §12).
export default function DashboardErrorPage({ reset }: DashboardErrorPageProps) {
  return <DashboardError onRetry={reset} />;
}
