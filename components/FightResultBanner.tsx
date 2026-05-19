import type { PredictionViewModel } from "@/lib/predictionViewModel";

interface FightResultBannerProps {
  viewModel: PredictionViewModel;
}

function methodLabel(method: string): string {
  switch (method) {
    case "ko_tko": return "KO/TKO";
    case "submission": return "SUB";
    case "decision": return "DEC";
    default: return method.toUpperCase();
  }
}

export function FightResultBanner({ viewModel }: FightResultBannerProps) {
  if (!viewModel.isScored || !viewModel.actualMethod) return null;

  const winnerName = viewModel.actualWinner?.name ?? null;
  const loserName =
    viewModel.actualWinner?.id === viewModel.fighterA.id
      ? viewModel.fighterB.name
      : viewModel.actualWinner?.id === viewModel.fighterB.id
        ? viewModel.fighterA.name
        : null;
  const wasCorrect = viewModel.modelCorrect;
  const methodCorrect = viewModel.methodCorrect;

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
                · {methodLabel(viewModel.actualMethod)}
                {viewModel.actualRound ? ` · R${viewModel.actualRound}` : ""}
                {viewModel.actualTime ? ` ${viewModel.actualTime}` : ""}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted">
              No result · {methodLabel(viewModel.actualMethod)}
              {viewModel.actualRound ? ` · R${viewModel.actualRound}` : ""}
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
