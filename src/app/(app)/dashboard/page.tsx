import type { Metadata } from "next";

export const metadata: Metadata = { title: "Home" };

// docs/agent-memory/auth.md A8.2: placeholder so navigation and redirects work.
// TODO(#20): build the Home dashboard.
export default function HomePage() {
  return <h1 className="m-0 text-2xl font-extrabold">Home</h1>;
}
