import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthSplit } from "@/components/AuthSplit";
import { SignedInRedirect } from "@/components/SignedInRedirect";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthSplit tagline="Your pet is waiting. It eats when you focus.">
      <Suspense fallback={null}>
        <SignedInRedirect />
      </Suspense>
      <AuthForm mode="signup" />
    </AuthSplit>
  );
}
