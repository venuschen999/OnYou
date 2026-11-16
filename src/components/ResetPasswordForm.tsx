"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ApiError, confirmPasswordReset } from "@/lib/api/auth";
import { SERVER_ERROR_MESSAGE } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { passwordSchema } from "@/lib/validation/auth";

const PRIMARY_LINK =
  "block w-full rounded-[14px] bg-primary px-[22px] py-[13px] text-center font-bold text-primary-foreground no-underline";
const PASSWORD_HINT =
  "8 to 15 characters. Saving signs you out everywhere, including any session in progress.";

// Mockup "Expired, used, or invalid link" (auth.md A14).
function LinkNoLongerWorks(): ReactElement {
  return (
    <div className="flex w-full max-w-[380px] flex-col gap-4">
      <h1 className="m-0 text-2xl font-extrabold">This link no longer works</h1>
      <p className="m-0 text-muted">
        Reset links work once and expire after 30 minutes. A newer link also
        replaces older ones. Request a new link to continue.
      </p>
      <Link href={ROUTES.forgotPassword} className={PRIMARY_LINK}>
        Send a new link
      </Link>
      <Link href={ROUTES.login} className={TEXT_LINK_CLASS}>
        Back to log in
      </Link>
    </div>
  );
}

type ResetPasswordFormProps = { token: string | null };

// US2 Set new password. The link is checked when the password is saved.
export function ResetPasswordForm({
  token,
}: ResetPasswordFormProps): ReactElement {
  const id = useId();
  const router = useRouter();
  const inFlight = useRef(false);
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isLinkInvalid, setIsLinkInvalid] = useState(!token);
  const [isSaving, setIsSaving] = useState(false);

  async function save(linkToken: string, value: string): Promise<void> {
    inFlight.current = true;
    setIsSaving(true);
    try {
      await confirmPasswordReset({ token: linkToken, password: value });
      // Stay disabled while navigating to login (auth.md A15).
      router.replace(ROUTES.loginAfterReset);
    } catch (error) {
      if (error instanceof ApiError && error.code === "RESET_LINK_INVALID") {
        setIsLinkInvalid(true);
      } else if (error instanceof ApiError && error.fields?.password) {
        setFieldError(error.fields.password);
      } else {
        setFormError(SERVER_ERROR_MESSAGE);
      }
      inFlight.current = false;
      setIsSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!token || inFlight.current) return;
    const result = passwordSchema.safeParse(password);
    setFormError(null);
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    void save(token, result.data);
  }

  if (isLinkInvalid) return <LinkNoLongerWorks />;

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex w-full max-w-[380px] flex-col gap-4"
    >
      <h1 className="m-0 text-2xl font-extrabold">Set a new password</h1>
      <Input
        id={`${id}-password`}
        label="New password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setFieldError(undefined);
        }}
        hint={PASSWORD_HINT}
        error={fieldError}
      />
      {formError ? (
        <ErrorMessage id={`${id}-form-error`} isAlert>
          {formError}
        </ErrorMessage>
      ) : null}
      <Button type="submit" isBlock disabled={isSaving}>
        {isSaving ? (
          <>
            <Spinner className="mr-2" /> Saving…
          </>
        ) : (
          "Save new password"
        )}
      </Button>
    </form>
  );
}
