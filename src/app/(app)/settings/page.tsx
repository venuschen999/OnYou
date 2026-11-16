import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { SettingsAccountEmail } from "@/components/SettingsAccountEmail";
import { SettingsPetSection } from "@/components/SettingsPetSection";

export const metadata: Metadata = { title: "Settings" };

// Mockup Settings: Pet name (#10, pet.md P6) and Account with email and
// Log out (#18, auth.md A17).
export default function SettingsPage() {
  return (
    <div className="flex max-w-[560px] flex-col gap-6">
      <h1 className="m-0 text-2xl font-extrabold">Settings</h1>
      <section aria-labelledby="settings-pet" className="flex flex-col gap-3">
        <h2 id="settings-pet" className="m-0 text-lg font-bold">
          Pet
        </h2>
        <SettingsPetSection />
      </section>
      <section
        aria-labelledby="settings-account"
        className="flex flex-col gap-3"
      >
        <h2 id="settings-account" className="m-0 text-lg font-bold">
          Account
        </h2>
        <Suspense fallback={null}>
          <SettingsAccountEmail />
        </Suspense>
        <LogoutButton />
      </section>
    </div>
  );
}
