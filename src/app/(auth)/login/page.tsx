import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthSplit } from "@/components/AuthSplit";
import { SignedInRedirect } from "@/components/SignedInRedirect";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthSplit tagline="Mochi missed you.">
      <Suspense fallback={null}>
        <SignedInRedirect />
      </Suspense>
      <AuthForm mode="login" />
    </AuthSplit>
  );
}
