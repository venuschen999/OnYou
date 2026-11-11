"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ApiError, logIn, signUp } from "@/lib/api/auth";
import { loginSchema } from "@/lib/validation/auth";
import { SERVER_ERROR_MESSAGE } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

export type AuthMode = "login" | "signup";
export type AuthField = "email" | "password";
type FieldErrors = Partial<Record<AuthField, string>>;

// "credentials" errors describe both fields; "server" errors describe neither.
export type FormError = { kind: "credentials" | "server"; message: string };

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function toFieldErrors(
  fields: Record<string, string> | undefined,
): FieldErrors {
  return { email: fields?.email, password: fields?.password };
}

function validate(values: Record<AuthField, string>) {
  const result = loginSchema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as AuthField;
    errors[field] ??= issue.message;
  }
  return { data: null, errors };
}

export function useAuthForm(mode: AuthMode) {
  const router = useRouter();
  const isInFlight = useRef(false);
  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isEmailInUse, setIsEmailInUse] = useState(false);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // auth.md A8.5: editing a field clears only that field's error.
  function updateField(field: AuthField, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    if (field === "email") setIsEmailInUse(false);
    setFormError((current) =>
      current?.kind === "credentials" ? null : current,
    );
  }

  function showRequestError(error: unknown): void {
    if (
      !(error instanceof ApiError) ||
      error.status >= 500 ||
      error.status === 0
    ) {
      setFormError({ kind: "server", message: SERVER_ERROR_MESSAGE });
    } else if (error.code === "INVALID_CREDENTIALS") {
      setFormError({ kind: "credentials", message: error.message });
    } else if (error.code === "EMAIL_IN_USE") {
      setIsEmailInUse(true);
      setFieldErrors({ email: error.message });
    } else if (error.fields) {
      setFieldErrors(toFieldErrors(error.fields));
    } else {
      setFormError({ kind: "server", message: SERVER_ERROR_MESSAGE });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    // Prevent overlapping requests from one tab (AGENTS.md §3).
    if (isInFlight.current) return;
    const { data, errors } = validate(values);
    setFieldErrors(errors);
    setFormError(null);
    if (!data) return;

    isInFlight.current = true;
    setIsSubmitting(true);
    try {
      // PRD v2.9 §6: the browser timezone is captured once, at signup.
      if (mode === "signup") {
        await signUp({ ...data, timezone: browserTimeZone() });
      } else {
        await logIn(data);
      }
      // Stay disabled while navigating Home (US1: success goes to Home).
      router.replace(ROUTES.home);
    } catch (error) {
      showRequestError(error);
      isInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return {
    values,
    fieldErrors,
    isEmailInUse,
    formError,
    isSubmitting,
    updateField,
    submit,
  };
}
