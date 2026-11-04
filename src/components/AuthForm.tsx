"use client";

import Link from "next/link";
import { useId, type ReactElement, type ReactNode } from "react";
import { useAuthForm, type AuthMode } from "@/hooks/useAuthForm";
import { Button } from "./ui/Button";
import { ErrorMessage } from "./ui/ErrorMessage";
import { Input } from "./ui/Input";
import { Spinner } from "./ui/Spinner";

type AuthFormProps = { mode: AuthMode };

// Copy from OnYou_web_mockups.html (Accounts) and docs/agent-memory/auth.md A8.6.
const COPY = {
  signup: {
    title: "Create your account",
    submit: "Create account",
    pending: "Creating account…",
    footPrompt: "Already have an account?",
    footLink: "Log in",
    footHref: "/login",
  },
  login: {
    title: "Welcome back",
    submit: "Log in",
    pending: "Logging in…",
    footPrompt: "New here?",
    footLink: "Create an account",
    footHref: "/signup",
  },
} as const;

const PASSWORD_HINT = "8 to 15 characters";

function linkClass(): string {
  return "text-[0.92rem] font-semibold text-primary no-underline hover:underline";
}

function EmailInUseMessage({ message }: { message: string }): ReactNode {
  return (
    <>
      {message}{" "}
      <Link href="/login" className={linkClass()}>
        Log in
      </Link>{" "}
      instead.
    </>
  );
}

export function AuthForm({ mode }: AuthFormProps): ReactElement {
  const copy = COPY[mode];
  const id = useId();
  const formErrorId = `${id}-form-error`;
  const form = useAuthForm(mode);
  const { fieldErrors, formError } = form;
  // PRD v2.9 §9: a credentials error must not point at one field, so it
  // describes both.
  const isCredentialsError = formError?.kind === "credentials";
  const sharedDescription = isCredentialsError ? [formErrorId] : [];

  const emailError =
    form.isEmailInUse && fieldErrors.email ? (
      <EmailInUseMessage message={fieldErrors.email} />
    ) : (
      fieldErrors.email
    );

  return (
    <form
      noValidate
      onSubmit={form.submit}
      className="flex w-full max-w-[380px] flex-col gap-4 sm:max-w-[380px]"
    >
      <h1 className="m-0 text-2xl font-extrabold">{copy.title}</h1>
      <Input
        id={`${id}-email`}
        label="Email"
        type="email"
        autoComplete="email"
        value={form.values.email}
        onChange={(event) => form.updateField("email", event.target.value)}
        error={emailError}
        isInvalid={isCredentialsError}
        describedBy={sharedDescription}
      />
      <Input
        id={`${id}-password`}
        label="Password"
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        value={form.values.password}
        onChange={(event) => form.updateField("password", event.target.value)}
        hint={mode === "signup" ? PASSWORD_HINT : undefined}
        error={fieldErrors.password}
        isInvalid={isCredentialsError}
        describedBy={sharedDescription}
      />
      {formError && (
        <ErrorMessage id={formErrorId} isAlert>
          {formError.message}
        </ErrorMessage>
      )}
      <Button type="submit" isBlock disabled={form.isSubmitting}>
        {form.isSubmitting ? (
          <>
            <Spinner className="mr-2" /> {copy.pending}
          </>
        ) : (
          copy.submit
        )}
      </Button>
      <p className="m-0 mt-1 text-[0.92rem] text-muted">
        {copy.footPrompt}{" "}
        <Link href={copy.footHref} className={linkClass()}>
          {copy.footLink}
        </Link>
      </p>
    </form>
  );
}
