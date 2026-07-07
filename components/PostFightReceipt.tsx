import type { PredictionViewModel } from "@/lib/predictionViewModel";
import type { CardReceipt, PostFightReceipt } from "@/lib/sourced-event";

/*
 * Post-fight receipt UI.
 *
 *   PostFightReceiptCard, the per-fight verdict on a scored fight.
 *   CardReceiptModule    , the card-level summary on the event page.
 *
 * Honesty contract: winner / finish correctness comes from the view model
 * (computed from the locked prediction + recorded outcome), NOT from authored
 * JSON, so a receipt can never claim a win the model didn't make. The authored
 * PostFightReceipt supplies only the qualitative read: label, right/missed,
 * lesson, narrative. Misses render in the wrong-state palette, not dressed up.
 *
 * Success/wrong colors belong to scored outcomes, which this is.
 */

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeTone = "correct" | "wrong" | "accent" | "neutral";

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const cls =
    tone === "correct"
      ? "border-success/30 bg-success-soft text-success"
      : tone === "wrong"
        ? "border-wrong/30 bg-wrong-soft text-wrong"
        : tone === "accent"
          ? "border-accent/30 bg-accent/[0.06] text-accent"
          : "border-line bg-surface-2 text-subtle";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${cls}`}>
      {label}
    </span>
  );
}

// ─── Per-fight receipt ────────────────────────────────────────────────────────

export function PostFightReceiptCard({
  viewModel: vm,
  receipt,
}: {
  viewModel: PredictionViewModel;
  receipt?: PostFightReceipt | null;
}) {
  // Only render on a scored fight. Receipt narrative is optional; if absent we
  // still show the computed verdict.
  if (!vm.isScored) return null;

  const winnerCorrect = vm.modelCorrect; // computed: locked call vs outcome
  const finishCorrect = vm.methodCorrect; // computed: finish-vs-decision
  const warningCorrect = receipt?.warningLayerGrade === "correct_warning";
  const tone = winnerCorrect === false ? "wrong" : winnerCorrect === true ? "correct" : "neutral";

  return (
    <section
      aria-label="Post-fight receipt"
      className={`overflow-hidden rounded-2xl border ${
        tone === "wrong" ? "border-wrong/25" : tone === "correct" ? "border-success/25" : "border-line"
      } bg-surface/70`}
    >
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 ${
        tone === "wrong" ? "border-wrong/20 bg-wrong-soft/40" : tone === "correct" ? "border-success/20 bg-success-soft/40" : "border-line bg-surface-2/40"
      }`}>
        <div className="flex items-center gap-2">
          <span className="mono-label">receipt</span>
          {receipt?.receiptLabel && (
            <span className={`text-sm font-semibold tracking-tight ${
              tone === "wrong" ? "text-wrong" : tone === "correct" ? "text-success" : "text-foreground"
            }`}>
              {receipt.receiptLabel}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {winnerCorrect !== null && (
            <Badge label={winnerCorrect ? "winner correct" : "winner miss"} tone={winnerCorrect ? "correct" : "wrong"} />
          )}
          {finishCorrect !== null && (
            <Badge label={finishCorrect ? "finish bucket correct" : "method miss"} tone={finishCorrect ? "correct" : "neutral"} />
          )}
          {warningCorrect && <Badge label="warning correct" tone="accent" />}
          {receipt?.underconfident && <Badge label="underconfident" tone="neutral" />}
        </div>
      </div>

      {receipt && (
        <div className="space-y-5 p-5">
          {receipt.receiptSummary && (
            <p className="text-sm leading-6 text-foreground">{receipt.receiptSummary}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {receipt.whatModelGotRight.length > 0 && (
              <div className="rounded-xl border border-line bg-background/35 p-4">
                <p className="mono-label text-foreground">what the model got right</p>
                <ul className="mt-2.5 space-y-1.5">
                  {receipt.whatModelGotRight.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-snug text-muted">
                      <span className="mt-1 size-1 shrink-0 rounded-full bg-success/70" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {receipt.whatModelMissed.length > 0 && (
              <div className="rounded-xl border border-line bg-background/35 p-4">
                <p className="mono-label text-foreground">what the model missed</p>
                <ul className="mt-2.5 space-y-1.5">
                  {receipt.whatModelMissed.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-snug text-muted">
                      <span className="mt-1 size-1 shrink-0 rounded-full bg-wrong/60" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {receipt.modelLesson && (
            <div className="rounded-xl border border-accent/20 bg-accent/[0.04] p-4">
              <p className="mono-label text-accent">model lesson · vNext</p>
              <p className="mt-1.5 text-sm leading-6 text-foreground">{receipt.modelLesson}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-line/60 pt-3 text-xs leading-5 text-subtle sm:flex-row sm:items-start sm:justify-between">
            {receipt.mediaNarrative && (
              <p className="max-w-xl">
                <span className="font-mono uppercase tracking-[0.12em] text-subtle/70">narrative · </span>
                {receipt.mediaNarrative}
              </p>
            )}
            <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle/60">
              {receipt.statSummary
                ? receipt.statSummary
                : "official stats pending review"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Card-level receipt ───────────────────────────────────────────────────────

function StatCell({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-background/35 px-3 py-3 text-center">
      <p className={`data-text text-2xl leading-none ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
      <p className="mono-label mt-1.5">{label}</p>
    </div>
  );
}

export function CardReceiptModule({ receipt }: { receipt?: CardReceipt | null }) {
  if (!receipt) return null;
  return (
    <section className="section-shell pb-5 md:pb-8" aria-label="Card receipt">
      <div className="rounded-2xl border border-line bg-surface/60 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="mono-label accent-rail">card receipt · scored</p>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle/60">
            winner + finish scored separately
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCell value={`${receipt.rawWinnerRecord.correct}/${receipt.rawWinnerRecord.total}`} label="winner calls" accent />
          <StatCell value={`${receipt.finishBucketRecord.correct}/${receipt.finishBucketRecord.total}`} label="finish buckets" />
          <StatCell value={`${receipt.cleanReadCount}`} label="clean reads" />
          <StatCell value={`${receipt.warningCorrectCount}`} label="warning saved a miss" />
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">{receipt.summary}</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-background/35 p-3">
            <p className="mono-label">biggest model win</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{receipt.biggestModelWin}</p>
          </div>
          <div className="rounded-xl border border-wrong/25 bg-wrong-soft/40 p-3">
            <p className="mono-label">biggest miss</p>
            <p className="mt-1 text-sm font-semibold text-wrong">{receipt.biggestModelMiss}</p>
          </div>
          <div className="rounded-xl border border-accent/25 bg-accent/[0.05] p-3">
            <p className="mono-label">best transparency</p>
            <p className="mt-1 text-sm font-semibold text-accent">{receipt.bestTransparencyMoment}</p>
          </div>
        </div>

        {receipt.mainLessons.length > 0 && (
          <details className="group mt-4 rounded-xl border border-line bg-background/25">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <span className="mono-label">what the card taught the model</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle group-open:hidden">show</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-subtle group-open:inline">hide</span>
            </summary>
            <ul className="space-y-1.5 border-t border-line px-4 py-3">
              {receipt.mainLessons.map((lesson) => (
                <li key={lesson} className="flex gap-2 text-sm leading-snug text-muted">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span>{lesson}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
