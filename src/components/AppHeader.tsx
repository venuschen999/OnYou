import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-4 max-[600px]:px-5">
      <span className="text-xl font-extrabold">OnYou</span>
      <nav
        className="flex gap-6 text-sm max-[600px]:gap-4"
        aria-label="Account"
      >
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-muted">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
