"use client";

import { useState } from "react";
import Link from "next/link";

export interface HomeEventOption {
  id: string;
  optionLabel: string;
  title: string;
  statusLabel: string;
  statusDetail: string;
  date: string;
  location: string;
  venue?: string | null;
  broadcastLine?: string | null;
  mainEvent?: string | null;
  featuredBout?: string | null;
  href: string;
  ctaLabel: string;
}

export function HomeEventSelector({ events }: { events: HomeEventOption[] }) {
  const [selectedId, setSelectedId] = useState(events[0]?.id ?? "");
  const selected = events.find((event) => event.id === selectedId) ?? events[0];

  if (!selected) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-label accent-rail">card discovery</p>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">choose a card.</h2>
        </div>
        <Link href="/events" className="text-xs uppercase tracking-[0.14em] text-subtle hover:text-accent">
          all events →
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {events.map((event) => {
          const isActive = event.id === selected.id;

          return (
            <article
              key={event.id}
              className={`overflow-hidden rounded-2xl border transition ${
                isActive
                  ? "border-accent/55 bg-gradient-to-br from-surface via-surface/95 to-accent/[0.04] shadow-[0_0_0_1px_rgba(143,215,247,0.12),0_4px_20px_rgba(143,215,247,0.06)]"
                  : "border-line bg-surface/60 hover:border-line-strong hover:bg-surface/80"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(event.id)}
                className="w-full p-4 text-left"
                aria-pressed={isActive}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="mb-3 block h-px bg-gradient-to-r from-transparent via-accent/55 to-transparent -mx-4 -mt-4 mb-4"
                  />
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className={`mono-label ${isActive ? "text-accent" : ""}`}>{event.optionLabel}</p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
                    {event.statusLabel}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-semibold leading-tight tracking-[-0.03em] text-foreground">
                  {event.title}
                </h3>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{event.date}</span>
                  <span>{event.location}</span>
                </div>
              </button>

              {isActive ? (
                <div className="border-t border-line/60 px-4 pb-4 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="status-pill is-active">
                      <span className="dot" />
                      {event.statusDetail}
                    </span>
                    {event.broadcastLine ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
                        {event.broadcastLine}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <p className="mono-label">main event</p>
                    <p className="mt-1.5 text-sm font-semibold leading-tight tracking-tight text-foreground">
                      {event.mainEvent ?? "Model calls unlock once fight data is available."}
                    </p>
                    {event.featuredBout ? (
                      <p className="mt-1.5 text-xs text-muted">
                        <span className="text-subtle">also listed · </span>{event.featuredBout}
                      </p>
                    ) : null}
                  </div>

                  <Link
                    href={event.href}
                    className="tap-target mt-4 inline-flex w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-background transition hover:brightness-110"
                  >
                    {event.ctaLabel}
                  </Link>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
