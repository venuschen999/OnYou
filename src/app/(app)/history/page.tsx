import type { Metadata } from "next";

export const metadata: Metadata = { title: "History" };

// docs/agent-memory/auth.md A8.2: placeholder so navigation and redirects work.
// TODO(#23): build the History screen.
export default function HistoryPage() {
  return <h1 className="m-0 text-2xl font-extrabold">History</h1>;
}
