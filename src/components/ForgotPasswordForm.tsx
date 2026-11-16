"use client";

import Link from "next/link";
import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { TEXT_LINK_CLASS } from "@/components/ui/linkStyles";
import { ApiError, requestPasswordReset } from "@/lib/api/auth";
import { SERVER_ERROR_MESSAGE } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { passwordResetRequestSchema } from "@/lib/validation/auth";

// The server's 429 copy is the mockup's; other failures use the shared copy.
function requestErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "TOO_MANY_REQUESTS") {
    return error.message;
  }
  return SERVER_ERROR_MESSAGE;
}

// US2 Forgot password and Reset link sent (OnYou_web_mockups.html).
export function ForgotPasswordForm(): ReactElement {
  const id = useId();
  const inFlight = useRef(false);
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function send(address: string): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSending(true);
    setFormError(null);
    try {
      await requestPasswordReset(address);
      setSentTo(address);
    } catch (error) {
      setSentTo(null);
      setFormError(requestErrorMessage(error));
    } finally {
      inFlight.current = false;
      setIsSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const result = passwordResetRequestSchema.safeParse({ email });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    void send(result.data.email);
  }

  if (sentTo) {
    return (
      <div className="flex w-full max-w-[380px] flex-col gap-4">
        <h1 className="m-0 text-2xl font-extrabold">Check your email</h1>
        <p className="m-0 text-muted">
          If an account exists for {sentTo}, a reset link is on its way. The
          link works once and expires in 30 minutes.
        </p>
        <Link href={ROUTES.login} className={TEXT_LINK_CLASS}>
          Back to log in
        </Link>
        <Button
          variant="secondary"
          isBlock
          disabled={isSending}
          onClick={() => void send(sentTo)}
        >
          Send another link
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex w-full max-w-[380px] flex-col gap-4"
    >
      <h1 className="m-0 text-2xl font-extrabold">Reset your password</h1>
      <p className="m-0 text-muted">
        Enter the email for your account. A reset link will be sent if the
        account exists.
      </p>
      <Input
        id={`${id}-email`}
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setFieldError(undefined);
        }}
        error={fieldError}
      />
      {formError ? (
        <ErrorMessage id={`${id}-form-error`} isAlert>
          {formError}
        </ErrorMessage>
      ) : null}
      <Button type="submit" isBlock disabled={isSending}>
        {isSending ? (
          <>
            <Spinner className="mr-2" /> Sending…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>
      <Link href={ROUTES.login} className={TEXT_LINK_CLASS}>
        Back to log in
      </Link>
    </form>
  );
}
