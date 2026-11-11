"use client";

import { PageError } from "@/components/PageError";

export default function AuthError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <PageError onRetry={retry} />;
}
