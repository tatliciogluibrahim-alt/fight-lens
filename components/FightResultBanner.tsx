import type { PredictionRecord } from "@/lib/accuracy/types";

interface FightResultBannerProps {
  prediction: PredictionRecord;
}

function methodLabel(method: string): string {
  switch (method) {
    case "ko_tko": return "KO/TKO";
    case "submission": return "SUB";
    case "decision": return "DEC";
    default: return method.toUpperCase();
  }
}

export function FightResultBanner({ prediction }: FightResultBannerProps) {
  const { outcome, prediction: pred, fighters } = prediction;
  if (!outcome) return null;

  const winnerName =
    outcome.winner === "fighterA"
      ? fighters.fighterA
      : outcome.winner === "fighterB"
        ? fighters.fighterB
        : null;

  const loserName =
    outcome.winner === "fighterA"
      ? fighters.fighterB
      : outcome.winner === "fighterB"
        ? fighters.fighterA
        : null;

  const modelPick =
    pred.fighterAWinProbability > pred.fighterBWinProbability
      ? "fighterA"
      : "fighterB";

  const wasCorrect =
    outcome.winner === "draw" || outcome.winner === "nc"
      ? null
      : outcome.winner === modelPick;

  const modelPickedFinish =
    pred.methodBreakdown.decision < 50;
  const actualFinish =
    outcome.method === "ko_tko" || outcome.method === "submission";
  const methodCorrect = modelPickedFinish === actualFinish;

  return (
    <div
      className={`border-b border-line px-5 py-4 md:px-6 ${
        wasCorrect === true
          ? "bg-success-soft"
          : wasCorrect === false
            ? "bg-wrong-soft"
            : "bg-surface/60"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
            result
          </span>
          {winnerName && loserName ? (
            <p className="text-sm font-semibold">
              {winnerName}{" "}
              <span className="font-normal text-muted">def.</span>{" "}
              {loserName}
              <span className="ml-2 font-mono text-xs font-normal text-muted">
                · {methodLabel(outcome.method)} · R{outcome.round} {outcome.time}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted">
              {outcome.winner === "draw" ? "Draw" : "No Contest"} · {methodLabel(outcome.method)} · R{outcome.round}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {wasCorrect !== null && (
            <span
              className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                wasCorrect
                  ? "bg-success-soft text-success"
                  : "bg-wrong-soft text-wrong"
              }`}
            >
              model {wasCorrect ? "✓ correct" : "✗ incorrect"}
            </span>
          )}
          {methodCorrect && (
            <span className="rounded-full bg-success-soft px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-success">
              method ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
