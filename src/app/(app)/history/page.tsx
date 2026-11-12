import type { Metadata } from "next";
import { HistoryScreen } from "@/components/HistoryScreen";

export const metadata: Metadata = { title: "History" };

// TODO(#22): render pages from GET /api/sessions after that contract is on main.
// This route does not fetch and does not show fixture sessions.
export default function HistoryPage() {
  return <HistoryScreen phase="loading" />;
}
