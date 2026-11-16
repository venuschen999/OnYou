import type { ReactElement } from "react";
import { Input } from "@/components/ui/Input";

// Mockup Settings Account email: shown, not editable (pet.md P6).
export function AccountEmail({ email }: { email: string }): ReactElement {
  return (
    <Input
      id="settings-email"
      label="Email"
      type="email"
      value={email}
      readOnly
    />
  );
}
