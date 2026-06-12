import type {
  FightMarketContext,
  FightModelSanity,
  ModelConfidenceLabel,
  ModelDataFlag,
} from "@/lib/sourced-event";

/*
 * Model-sanity display layer.
 *
 * Renders the manual transparency metadata that wraps a model lean:
 *   - ModelWarningBanner  — visible warning when manual context challenges the lean
 *   - DataWarningPill     — model confidence label (Strong … Data caution)
 *   - SharpInsight        — the one-sentence sharpest read on the fight
 *   - MarketContextNote   — analytical market sanity check (never sportsbook UI)
 *   - ContextTag          — compact blind-spot flag chips
 *
 * Composition helpers:
 *   - ModelSanityLead     — warning + confidence/analyst line (directly after the lean)
 *   - ModelContextFooter  — market context + flag chips (after manual context)
 *   - CardModelSanity     — card-level summary module for the event page
 *
 * Palette rules follow ContextualNotes: success/wrong colors belong to scored
 * outcomes only. Everything here uses neutral chips + the accent for the
 * single strongest signal (the model warning). Copy carries the meaning.
 */

const FLAG_LABELS: Record<ModelDataFlag, string> = {
  small_sample: "small sample",
  opponent_tier_mismatch: "opponent-tier blind spot",
  ranking_mismatch: "ranking mismatch",
  age_mileage: "age / mileage",
  division_change: "division change",
  short_notice: "short notice",
  outdoor_environment: "outdoor environment",
  market_divergence: "market divergence",
  style_specific_blindspot: "style blind spot",
};

// Confidence labels that warrant a more present treatment — these are the
// "read this number carefully" states.
const CAUTION_LABELS: ModelConfidenceLabel[] = ["Low", "Data caution"];

export function ContextTag({ flag }: { flag: ModelDataFlag }) {
  return (
    <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-subtle">
      {FLAG_LABELS[flag] ?? flag}
    </span>
  );
}

export function DataWarningPill({ label }: { label: ModelConfidenceLabel }) {
  const cautious = CAUTION_LABELS.includes(label);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${
        cautious
          ? "border-line-strong bg-surface-2 text-foreground"
          : "border-line bg-surface-2 text-subtle"
      }`}
    >
      <span className={`size-1 rounded-full ${cautious ? "bg-foreground/70" : "bg-subtle/60"}`} />
      data confidence · {label.toLowerCase()}
    </span>
  );
}

export function ModelWarningBanner({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/[0.05] px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
        model warning · manual context challenges lean
      </p>
      <p className="mt-1.5 text-sm leading-snug text-foreground">{text}</p>
    </div>
  );
}

export function SharpInsight({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-line bg-background/35 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">sharpest insight</p>
      <p className="mt-1 text-sm leading-snug text-foreground">{text}</p>
    </div>
  );
}

export function MarketContextNote({ market }: { market: FightMarketContext }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
        market context · not in model
        {market.asOf ? ` · ${market.asOf.toLowerCase()} snapshot` : ""}
      </p>
      <p className="mt-1 text-sm leading-snug text-muted">{market.displayCopy}</p>
    </div>
  );
}

/**
 * Lead block — renders immediately after the model lean:
 * warning banner (when present) + confidence pill + analyst-check sentence.
 */
export function ModelSanityLead({ sanity }: { sanity?: FightModelSanity | null }) {
  if (!sanity) return null;
  const hasLine = sanity.modelConfidenceLabel || sanity.analystCheckCopy;
  if (!sanity.modelWarning && !hasLine) return null;

  return (
    <div className="space-y-3">
      {sanity.modelWarning ? <ModelWarningBanner text={sanity.modelWarning} /> : null}
      {hasLine ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <DataWarningPill label={sanity.modelConfidenceLabel} />
          {sanity.analystCheckCopy ? (
            <p className="min-w-0 flex-1 basis-64 text-xs leading-5 text-muted">
              <span className="text-subtle">analyst check · </span>
              {sanity.analystCheckCopy}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Footer block — renders after manual context:
 * market sanity line + blind-spot flag chips.
 */
export function ModelContextFooter({ sanity }: { sanity?: FightModelSanity | null }) {
  if (!sanity) return null;
  const hasTags = sanity.dataFlags?.length > 0;
  if (!sanity.marketContext && !hasTags) return null;

  return (
    <div className="space-y-3">
      {sanity.marketContext ? <MarketContextNote market={sanity.marketContext} /> : null}
      {hasTags ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-subtle/70">
            model blind spots ·
          </span>
          {sanity.dataFlags.map((flag) => (
            <ContextTag key={flag} flag={flag} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Card-level model-sanity module for the event page. Renders only when the
 * event carries a manual cardSummary. Compact by design.
 */
export function CardModelSanity({
  summary,
  blindSpots,
  environmentNote,
}: {
  summary?: string | null;
  blindSpots?: string[] | null;
  environmentNote?: string | null;
}) {
  if (!summary && !environmentNote) return null;

  return (
    <section className="section-shell pb-5 md:pb-8" aria-label="Card model read">
      <div className="rounded-2xl border border-line bg-surface/60 p-5 md:p-6">
        <p className="mono-label">card model read</p>
        {summary ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{summary}</p>
        ) : null}
        {blindSpots && blindSpots.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-subtle/70">
              card blind spots ·
            </span>
            {blindSpots.map((spot) => (
              <span
                key={spot}
                className="rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-subtle"
              >
                {spot}
              </span>
            ))}
          </div>
        ) : null}
        {environmentNote ? (
          <p className="mt-4 border-t border-line/60 pt-3 text-xs leading-5 text-subtle">
            <span className="font-mono uppercase tracking-[0.12em]">environment · </span>
            {environmentNote}
          </p>
        ) : null}
      </div>
    </section>
  );
}
