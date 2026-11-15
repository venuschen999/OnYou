import type { Metadata } from "next";
import { HomeDashboard } from "@/components/HomeDashboard";

export const metadata: Metadata = { title: "Home" };

// TODO(#19): Home shows the mockup error until GET /api/pet exists.
export default function HomePage() {
  return <HomeDashboard />;
}
