import type { Metadata } from "next";
import { Recursive } from "next/font/google";
import { SessionPresence } from "@/components/SessionPresence";
import "./globals.css";

// One sans-serif family, matching OnYou_web_mockups.html (AGENTS.md §7).
const recursive = Recursive({
  variable: "--font-recursive",
  subsets: ["latin"],
  axes: ["CASL"],
});

export const metadata: Metadata = {
  title: "OnYou",
  description: "Turn focus time into care for your virtual pet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${recursive.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SessionPresence>{children}</SessionPresence>
      </body>
    </html>
  );
}
