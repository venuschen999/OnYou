import type { Metadata } from "next";
import { AuthSplit } from "@/components/AuthSplit";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

// US2. Mockup tagline for every reset screen.
export default function ForgotPasswordPage() {
  return (
    <AuthSplit tagline="Your progress is safe. Only the password changes.">
      <ForgotPasswordForm />
    </AuthSplit>
  );
}
