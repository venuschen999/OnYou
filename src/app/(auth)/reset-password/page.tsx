import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthSplit } from "@/components/AuthSplit";
import { ResetPasswordFromLink } from "@/components/ResetPasswordFromLink";

export const metadata: Metadata = { title: "Set new password" };

// US2. Reading the query string sits behind Suspense (cacheComponents).
export default function ResetPasswordPage() {
  return (
    <AuthSplit tagline="Your progress is safe. Only the password changes.">
      <Suspense fallback={null}>
        <ResetPasswordFromLink />
      </Suspense>
    </AuthSplit>
  );
}
