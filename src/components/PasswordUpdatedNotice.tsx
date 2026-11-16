"use client";

import { useSearchParams } from "next/navigation";
import type { ReactElement } from "react";

// Mockup "Password updated" login state, after /login?reset=done (auth.md A15).
export function PasswordUpdatedNotice(): ReactElement | null {
  const params = useSearchParams();
  if (params.get("reset") !== "done") return null;
  return (
    <p
      role="status"
      className="m-0 mb-4 w-full max-w-[380px] rounded-[14px] bg-tint px-4 py-3 font-semibold"
    >
      Password updated. Log in with your new password.
    </p>
  );
}
