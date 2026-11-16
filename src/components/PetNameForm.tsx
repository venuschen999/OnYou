"use client";

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
import { ApiError } from "@/lib/api/sessions";
import { renamePet, type PetProgressView } from "@/lib/api/pet";
import { SERVER_ERROR_MESSAGE } from "@/lib/messages";
import { petNameSchema } from "@/lib/validation/pet";

type PetNameFormProps = {
  initialName: string;
  // #20 can refresh Home from the saved pet (pet.md P7).
  onSaved?: (pet: PetProgressView) => void;
};

const HINT = "Up to 30 characters. Leave blank to use Mochi.";

// Mockup Settings "Pet name" with its error and "Name saved" states (US3).
export function PetNameForm({
  initialName,
  onSaved,
}: PetNameFormProps): ReactElement {
  const id = useId();
  const inFlight = useRef(false);
  const [name, setName] = useState(initialName);
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save(value: string): Promise<void> {
    inFlight.current = true;
    setIsSaving(true);
    try {
      const pet = await renamePet(value);
      setName(pet.name);
      setSavedName(pet.name);
      onSaved?.(pet);
    } catch (error) {
      const serverField =
        error instanceof ApiError ? error.fields?.name : undefined;
      if (serverField) setFieldError(serverField);
      else setFormError(SERVER_ERROR_MESSAGE);
    } finally {
      inFlight.current = false;
      setIsSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (inFlight.current) return;
    setSavedName(null);
    setFormError(null);
    const result = petNameSchema.safeParse(name);
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    void save(result.data);
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <div className="flex-1">
        <Input
          id={`${id}-name`}
          label="Pet name"
          type="text"
          autoComplete="off"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setFieldError(undefined);
            setSavedName(null);
          }}
          hint={fieldError || savedName ? undefined : HINT}
          error={fieldError}
        />
        {savedName ? (
          <p role="status" className="m-0 mt-1.5 text-sm text-success">
            Name saved. Your pet is now {savedName}.
          </p>
        ) : null}
        {formError ? (
          <ErrorMessage id={`${id}-form-error`} isAlert>
            {formError}
          </ErrorMessage>
        ) : null}
      </div>
      <Button
        type="submit"
        variant="secondary"
        disabled={isSaving}
        className="sm:mt-7"
      >
        Save name
      </Button>
    </form>
  );
}
