"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { ROUTES } from "@/lib/routes";

// AGENTS.md §7: nav is Home, History, Settings, including during a session.
const NAV_ITEMS = [
  { label: "Home", href: ROUTES.home },
  { label: "History", href: ROUTES.history },
  { label: "Settings", href: ROUTES.settings },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader(): ReactElement {
  const pathname = usePathname();
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-4 sm:px-9">
      <span className="text-[1.15rem] font-extrabold sm:text-xl">OnYou</span>
      <nav
        aria-label="Main"
        className="flex gap-4 text-[0.88rem] sm:gap-8 sm:text-[0.95rem]"
      >
        {NAV_ITEMS.map(({ label, href }) => {
          const isActive = isCurrent(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className="border-b-2 border-transparent py-1 text-muted no-underline aria-[current=page]:border-primary aria-[current=page]:font-bold aria-[current=page]:text-foreground"
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
