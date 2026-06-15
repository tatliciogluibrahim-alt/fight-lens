import Link from "next/link";
import { formatRanking, getCountryDisplay } from "@/lib/display";
import { CountryFlag } from "./CountryFlag";
import type { SourcedFight, SourcedFighter } from "@/lib/sourced-event";
import type { PredictionRecord } from "@/lib/accuracy/types";
import type { PredictionViewModel } from "@/lib/predictionViewModel";

interface FightCardProps {
  fight: SourcedFight;
  eventId: string;
  prediction?: PredictionRecord | null;
  predictionViewModel?: PredictionViewModel | null;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function RecordLine({ fighter }: { fighter: SourcedFighter }) {
  const ranking = formatRanking(fighter.ranking);
  const parts = [
    fighter.record ?? null,
    ranking !== "UNRANKED" ? ranking : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return <p className="data-text text-xs text-subtle">{parts.join(" · ")}</p>;
}

function FighterCountry({ fighter }: { fighter: SourcedFighter }) {
  const country = getCountryDisplay(fighter);
  return (
    <CountryFlag
      code={country?.code ?? "TBD"}
      label={country?.label ?? "country pending"}
    />
  );
}

function ResultChip({ viewModel }: { viewModel: PredictionViewModel }) {
  if (viewModel.resultState === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-subtle">
        <span className="size-1.5 rounded-full bg-subtle/60" />
        Pending
      </span>
    );
  }

  if (viewModel.resultState === "noResult" || viewModel.modelCorrect === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-muted">
        No result
      </span>
    );
  }

  const correct = viewModel.modelCorrect;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] ${
        correct
          ? "border border-success/30 bg-success-soft text-success"
          : "border border-wrong/30 bg-wrong-soft text-wrong"
      }`}
    >
      <span className={`size-1.5 rounded-full ${correct ? "bg-success" : "bg-wrong"}`} />
      {correct ? "Correct" : "Incorrect"}
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FightCard({ fight, eventId, predictionViewModel }: FightCardProps) {
  const fighterA = fight.fighters.fighterA;
  const fighterB = fight.fighters.fighterB;

  const vm = predictionViewModel ?? null;
  const hasPred = !!vm && vm.callState !== "insufficientData" && vm.callState !== "pending";
  const favA = vm?.predictedWinner?.id === fighterA.id;
  const favB = vm?.predictedWinner?.id === fighterB.id;
  const probA = vm?.fighterA.winProbability ?? null;
  const probB = vm?.fighterB.winProbability ?? null;
  const methodTop = vm?.methodLean ?? null;

  // Surface the strongest model-sanity signal at list level so a card can be
  // scanned without opening every fight: a model warning (manual context
  // challenges the lean) outranks a data-caution confidence label.
  const sanity = fight.modelSanity;
  const sanityChip = sanity?.modelWarning
    ? { label: "model warning", accent: true }
    : sanity?.modelConfidenceLabel === "Data caution" || sanity?.modelConfidenceLabel === "Low"
      ? { label: "data caution", accent: false }
      : null;

  // Once scored, the receipt label replaces the pre-fight sanity chip in the
  // scan row. Tone is computed from the call result, not the label string.
  const scored = !!vm?.isScored;
  const receiptLabel = scored ? fight.postFightReceipt?.receiptLabel ?? null : null;
  const receiptTone: "correct" | "wrong" | "neutral" =
    vm?.modelCorrect === false ? "wrong" : vm?.modelCorrect === true ? "correct" : "neutral";
  const receiptChipClass =
    receiptTone === "wrong"
      ? "border-wrong/30 bg-wrong-soft text-wrong"
      : receiptTone === "correct"
        ? "border-success/30 bg-success-soft text-success"
        : "border-line bg-surface-2 text-subtle";

  // On mobile, only show the ResultChip when the fight has a scored outcome —
  // "Pending" is implied by context so we suppress it to reduce clutter.
  const showMobileResultChip = vm && vm.resultState === "scored";

  return (
    <div className="border-b border-line last:border-b-0">

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE card layout — visible only below sm (640 px)
          Stacked fighter names (full text, wrapping), compact prediction row,
          full-width "View read" CTA. No flags, no records, no expand button.
          ════════════════════════════════════════════════════════════════════ */}
      <div className="sm:hidden p-4">

        {/* Fighter matchup — stacked, full names, wrapping text */}
        <div>
          <p className={`text-base font-semibold leading-snug tracking-tight ${favA ? "text-accent" : "text-foreground"}`}>
            {fighterA.name}
          </p>
          <p className="my-1 font-mono text-[9px] uppercase tracking-[0.1em] text-subtle/70">vs</p>
          <p className={`text-base font-semibold leading-snug tracking-tight ${favB ? "text-accent" : "text-foreground"}`}>
            {fighterB.name}
          </p>
        </div>

        {/* Metadata — weight class · rounds · card placement */}
        <p className="mt-2 data-text text-xs text-subtle">
          {(fight.weightClass ?? "weight pending").toLowerCase()}
          {" · "}{fight.rounds}R
          {" · "}{fight.cardPlacement.toLowerCase()}
        </p>

        {/* Prediction — only when a call is available */}
        {hasPred && (
          <div className="mt-3 space-y-1">
            {vm.isNamedCall && vm.predictedWinner ? (
              <p className="text-sm text-muted">
                <span className="text-subtle">lean · </span>
                <span className="font-semibold text-foreground">{vm.predictedWinner.name}</span>
                <span className="data-text ml-1.5 tabular-nums text-foreground">
                  {vm.winnerProbability}%
                </span>
              </p>
            ) : (
              <p className="text-sm font-medium text-muted">{vm.displayedCallLabel}</p>
            )}
            {methodTop && (
              <p className="text-xs text-subtle">
                {methodTop}
                <span className="opacity-60"> lean</span>
              </p>
            )}
            {receiptLabel ? (
              <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${receiptChipClass}`}>
                {receiptLabel}
              </span>
            ) : sanityChip ? (
              <span
                className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${
                  sanityChip.accent
                    ? "border-accent/30 bg-accent/[0.06] text-accent"
                    : "border-line bg-surface-2 text-subtle"
                }`}
              >
                {sanityChip.label}
              </span>
            ) : null}
          </div>
        )}
        {!hasPred && (
          <p className="mt-3 text-sm text-muted">
            <span className="text-subtle">model status · </span>
            forecast pending
          </p>
        )}

        {/* Result chip — only when scored, not for pending */}
        {showMobileResultChip && (
          <div className="mt-2">
            <ResultChip viewModel={vm} />
          </div>
        )}

        {/* CTA — full width, easy tap target */}
        <Link
          href={`/events/${eventId}/${fight.id}`}
          className="tap-target mt-3 flex w-full items-center justify-center rounded-full border border-line-strong bg-surface-2 text-sm font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/10"
        >
          View read
        </Link>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DESKTOP row layout — visible only at sm+ (640 px and up)
          Side-by-side fighters with VS/probability in center, call meta row,
          expand button + View read CTA.
          ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden sm:block">
        <div className="p-5">

          {/* Fighters — always side-by-side at desktop */}
          <div className="flex items-start gap-3">
            {/* Fighter A */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <FighterCountry fighter={fighterA} />
                <p className={`min-w-0 truncate text-base font-semibold leading-snug tracking-tight ${favA ? "text-accent" : "text-foreground"}`}>
                  {fighterA.name}
                </p>
              </div>
              <RecordLine fighter={fighterA} />
            </div>

            {/* VS centre with probability */}
            <div className="flex shrink-0 flex-col items-center gap-0.5 pt-px">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-subtle">vs</p>
              {hasPred && (
                <p className="data-text mt-0.5 text-[11px] tabular-nums">
                  <span className={favA ? "font-semibold text-foreground" : "text-muted"}>{probA}%</span>
                  <span className="mx-0.5 text-subtle/50">–</span>
                  <span className={favB ? "font-semibold text-foreground" : "text-muted"}>{probB}%</span>
                </p>
              )}
            </div>

            {/* Fighter B */}
            <div className="min-w-0 flex-1 text-right">
              <div className="flex items-center justify-end gap-2">
                <p className={`min-w-0 truncate text-base font-semibold leading-snug tracking-tight ${favB ? "text-accent" : "text-foreground"}`}>
                  {fighterB.name}
                </p>
                <FighterCountry fighter={fighterB} />
              </div>
              <div className="flex justify-end">
                <RecordLine fighter={fighterB} />
              </div>
            </div>
          </div>

          {/* Call meta row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="data-text text-subtle">
              {(fight.weightClass ?? "weight pending").toLowerCase()} · {fight.rounds}R
            </span>

            {hasPred && vm.isNamedCall && vm.predictedWinner ? (
              <span className="text-muted">
                <span className="text-subtle">lean · </span>
                <span className="font-medium text-foreground">{vm.predictedWinner.name}</span>
              </span>
            ) : hasPred && !vm.isNamedCall ? (
              <span className="font-medium text-muted">{vm.displayedCallLabel}</span>
            ) : (
              <span className="text-muted">
                <span className="text-subtle">model status · </span>
                forecast pending
              </span>
            )}

            {methodTop && (
              <span className="text-subtle">
                {methodTop}<span className="opacity-60"> lean</span>
              </span>
            )}

            {receiptLabel ? (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${receiptChipClass}`}>
                {receiptLabel}
              </span>
            ) : sanityChip ? (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${
                  sanityChip.accent
                    ? "border-accent/30 bg-accent/[0.06] text-accent"
                    : "border-line bg-surface-2 text-subtle"
                }`}
              >
                {sanityChip.label}
              </span>
            ) : null}

            {vm && (
              <span className="ml-auto">
                <ResultChip viewModel={vm} />
              </span>
            )}
          </div>

          {/*
            Action row — single "View read" CTA.
            Removed the "+" expand-in-place: it duplicated win-probability and
            method-lean bars that already live in full on the fight detail
            page. Card list now drives users straight to the read.
          */}
          <div className="mt-3">
            <Link
              href={`/events/${eventId}/${fight.id}`}
              className="tap-target inline-flex w-full items-center justify-center rounded-full border border-line-strong bg-surface-2 px-4 text-xs font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/10 sm:w-auto"
            >
              View read
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
