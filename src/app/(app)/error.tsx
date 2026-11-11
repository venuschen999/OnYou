"use client";

import { PageError } from "@/components/PageError";

export default function AppError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <PageError onRetry={retry} />;
}
