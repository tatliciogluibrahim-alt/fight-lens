"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PrototypeBadge } from "./PrototypeBadge";

const links = [
  { href: "/", label: "overview" },
  { href: "/events/ufc-328", label: "card" },
  { href: "/events/ufc-328/chimaev-strickland", label: "matchup" }
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/86 backdrop-blur-xl">
      <nav className="section-shell flex min-h-16 flex-wrap items-center justify-between gap-3 py-3 md:flex-nowrap">
        <Link href="/" className="flex min-h-11 items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg border border-line-strong bg-surface-2">
            <span className="size-3 rounded-sm bg-accent shadow-[0_0_24px_rgba(200,91,63,0.45)]" />
          </span>
          <span className="leading-none">
            <span className="block text-base font-semibold tracking-[-0.03em]">fight lens</span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
              see the shape
            </span>
          </span>
        </Link>

        <div className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-full border border-line bg-surface/80 p-1 md:order-2 md:w-auto">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.label === "matchup" && pathname.startsWith("/events/ufc-328/"));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`tap-target flex shrink-0 items-center rounded-full px-4 text-sm transition ${
                  isActive
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:bg-surface-2/80 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {process.env.NEXT_PUBLIC_DEBUG_MODE === "true" && (
          <PrototypeBadge className="order-2 md:order-3" />
        )}
      </nav>
    </header>
  );
}
