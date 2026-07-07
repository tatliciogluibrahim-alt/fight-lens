"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PrototypeBadge } from "./PrototypeBadge";

const links = [
  { href: "/", label: "home", mobileVisible: true },
  // "cards" matches the mobile tab label and the product copy ("Current Card",
  // "Open card", "Browse all cards"), desktop previously said "events", which
  // described the same destination with a different word.
  { href: "/events", label: "cards", mobileVisible: true },
  { href: "/record", label: "record", mobileVisible: true },
  // "how it works" is hidden from the mobile nav to prevent label clipping.
  // The case study lives in the footer only, keeping it out of primary nav
  // keeps the app reading as a product, not a portfolio artifact.
  { href: "/methodology", label: "how it works", mobileVisible: false },
];

const mobileLinks = [
  {
    href: "/",
    label: "home",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2.5 7.1 8 2.7l5.5 4.4V13a.5.5 0 0 1-.5.5h-3.1V9.4H6.1v4.1H3a.5.5 0 0 1-.5-.5V7.1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/events",
    label: "cards",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2.4" y="3.6" width="11.2" height="8.8" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2.8 6.5h10.4" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    href: "/record",
    label: "record",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3.5 12.8V9.4M8 12.8V4.2M12.5 12.8V7.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

function isActivePath(pathname: string, href: string) {
  return (
    pathname === href ||
    (href === "/events" && pathname.startsWith("/events")) ||
    (href === "/record" && (pathname.startsWith("/record") || pathname.startsWith("/backtests"))) ||
    (href === "/methodology" && pathname.startsWith("/methodology"))
  );
}

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-background/85 backdrop-blur-xl">
      {/*
        Single-row layout always, no flex-wrap, so the header stays at a
        fixed height (h-14 = 56px) on all screen sizes. Phase 2: trimmed
        from h-16 → h-14 to reduce vertical chrome and reclaim above-the-fold
        space on fight detail pages.
      */}
      <nav className="section-shell flex h-14 items-center justify-between gap-3">
        {/* Logo, tighter, single-line wordmark */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="lens-mark size-6" />
          <span className="text-[15px] font-semibold leading-none tracking-[-0.03em]">fight lens</span>
        </Link>

        {/* Nav pills, right-aligned, scrollable on narrow screens */}
        <div className="hidden min-w-0 shrink items-center justify-end gap-2 sm:flex">
          <div className="nav-pill-scroll flex items-center gap-1 overflow-x-auto rounded-full border border-line bg-surface/80 p-1">
            {links.map((link) => {
              const isActive = isActivePath(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`tap-target flex shrink-0 items-center rounded-full px-4 text-sm transition ${
                    isActive
                      ? "bg-surface-2 text-foreground"
                      : "text-muted hover:bg-surface-2/80 hover:text-foreground"
                  } ${!link.mobileVisible ? "hidden sm:flex" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {process.env.NEXT_PUBLIC_DEBUG_MODE === "true" && <PrototypeBadge />}
        </div>
      </nav>

      <nav className="mobile-tabbar sm:hidden" aria-label="Primary">
        <div className="mobile-tabbar-inner">
          {mobileLinks.map((link) => {
            const isActive = isActivePath(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className="mobile-tabbar-link"
                data-active={isActive ? "true" : "false"}
                aria-current={isActive ? "page" : undefined}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
