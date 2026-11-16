import type { Metadata } from "next";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata: Metadata = { title: "Settings" };

// Account section with Log out (#18, auth.md A17).
// TODO(#10): add the Pet name group and the account email from the mockup.
export default function SettingsPage() {
  return (
    <div className="flex max-w-[560px] flex-col gap-6">
      <h1 className="m-0 text-2xl font-extrabold">Settings</h1>
      <section
        aria-labelledby="settings-account"
        className="flex flex-col gap-3"
      >
        <h2 id="settings-account" className="m-0 text-lg font-bold">
          Account
        </h2>
        <LogoutButton />
      </section>
    </div>
  );
}
