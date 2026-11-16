import type { Metadata } from "next";
import { HistoryLoader } from "@/components/HistoryLoader";

export const metadata: Metadata = { title: "History" };

// US8: this page reads GET /api/sessions. Dates use the browser zone, which
// signup stored as the account timezone. The history response has no zone.
export default function HistoryPage() {
  return <HistoryLoader />;
}
