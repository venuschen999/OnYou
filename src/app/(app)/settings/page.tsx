import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

// docs/agent-memory/auth.md A8.2: placeholder so navigation and redirects work.
// TODO(#10): build the Settings screen.
export default function SettingsPage() {
  return <h1 className="m-0 text-2xl font-extrabold">Settings</h1>;
}
