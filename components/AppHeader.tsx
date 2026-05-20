"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PrototypeBadge } from "./PrototypeBadge";

// Updated whenever a new event goes live — single source of truth for the nav
const LATEST_EVENT_ID = "ufc-329";

const links = [
  { href: "/", label: "home" },
  { href: `/events/${LATEST_EVENT_ID}`, label: "events" },
  { href: "/record", label: "record" },
  { href: "/methodology", label: "method" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur-xl">
      {/*
        Single-row layout always — no flex-wrap — so the header stays at a
        fixed height (h-16 = 64px) on all screen sizes. On mobile the nav
        pill bar scrolls horizontally rather than wrapping to a second row.
        This prevents page content from hiding under a taller two-row header.
      */}
      <nav className="section-shell flex h-16 items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="lens-mark size-7" />
          <span className="leading-none">
            <span className="block text-base font-semibold tracking-[-0.03em]">fight lens</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-subtle sm:block">
              forecast · tracked
            </span>
          </span>
        </Link>

        {/* Nav pills — right-aligned, scrollable on narrow screens */}
        <div className="flex min-w-0 shrink items-center justify-end gap-2">
          <div className="nav-pill-scroll flex items-center gap-1 overflow-x-auto rounded-full border border-line bg-surface/80 p-1">
            {links.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href.startsWith("/events/") && pathname.startsWith("/events/")) ||
                (link.href === "/record" &&
                  (pathname.startsWith("/record") || pathname.startsWith("/backtests"))) ||
                (link.href === "/methodology" && pathname.startsWith("/methodology"));

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

          {process.env.NEXT_PUBLIC_DEBUG_MODE === "true" && <PrototypeBadge />}
        </div>
      </nav>
    </header>
  );
}
