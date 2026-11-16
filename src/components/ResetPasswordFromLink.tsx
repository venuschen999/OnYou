"use client";

import { useSearchParams } from "next/navigation";
import type { ReactElement } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

// Reads ?token= from the emailed link (auth.md A13).
export function ResetPasswordFromLink(): ReactElement {
  const token = useSearchParams().get("token");
  return <ResetPasswordForm token={token || null} />;
}
