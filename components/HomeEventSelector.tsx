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
    <div className="rounded-2xl border border-line bg-surface/70 p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mono-label">event discovery</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] md:text-3xl">choose a card.</h2>
        </div>
        <label className="block sm:w-[280px]">
          <span className="mono-label mb-2 block">selected event</span>
          <select
            value={selected.id}
            onChange={(event) => setSelectedId(event.target.value)}
            className="tap-target w-full rounded-full border border-line bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-accent"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id} className="bg-background text-foreground">
                {event.optionLabel}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-background/35 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-pill">
            <span className="dot" />
            {selected.statusLabel}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
            {selected.statusDetail}
          </span>
        </div>

        <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.04em] md:text-4xl">
          {selected.title}
        </h3>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <span>{selected.date}</span>
          <span>{selected.location}</span>
          {selected.broadcastLine ? <span>{selected.broadcastLine}</span> : null}
        </div>
        {selected.venue ? (
          <p className="mt-2 text-sm text-subtle">{selected.venue}</p>
        ) : null}

        <div className="mt-5 border-t border-line/60 pt-4">
          <p className="mono-label">main event</p>
          <p className="mt-2 text-base font-semibold leading-tight tracking-tight text-foreground md:text-lg">
            {selected.mainEvent ?? "Forecast opens when fight data is ready."}
          </p>
          {selected.featuredBout ? (
            <p className="mt-2 text-sm text-muted">
              <span className="text-subtle">also listed · </span>{selected.featuredBout}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={selected.href}
            className="tap-target inline-flex w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-background transition hover:brightness-110 sm:w-auto"
          >
            {selected.ctaLabel}
          </Link>
          <Link
            href="/events"
            className="tap-target inline-flex w-full items-center justify-center rounded-full border border-line-strong bg-surface-2 px-5 text-sm text-foreground transition hover:border-accent/40 sm:w-auto"
          >
            All events
          </Link>
        </div>
      </div>
    </div>
  );
}
