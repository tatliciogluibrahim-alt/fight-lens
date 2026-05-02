import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CreatorCardSamples } from "@/components/CreatorCardSamples";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";
import { PrototypeBadge } from "@/components/PrototypeBadge";
import backtest from "@/data/normalized/backtests/islam-jdm.json";

type FighterKey = "islam" | "jdm";

function formatControl(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function FighterSummary({ fighterKey }: { fighterKey: FighterKey }) {
  const fighter = backtest.fighters[fighterKey];

  return (
    <div className="border border-line bg-background/45 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mono-label">{fighter.role}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">{fighter.name}</h2>
        </div>
        <p className="data-text text-sm text-subtle">{fighter.sourceRecord}</p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Metric label="sample" value={fighter.sample.fights} />
        <Metric label="wins" value={fighter.sample.wins} />
        <Metric label="late samples" value={fighter.sample.lateSamples} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Score label="striking signal" value={fighter.modelScores.strikingVolume} tone={fighterKey === "islam" ? "accent" : "plain"} />
        <Score label="wrestling" value={fighter.modelScores.wrestlingPressure} tone={fighterKey === "islam" ? "accent" : "plain"} />
        <Score label="finish urgency" value={fighter.modelScores.finishUrgency} tone={fighterKey === "islam" ? "accent" : "plain"} />
        <Score label="late evidence" value={fighter.modelScores.lateEvidence} tone={fighterKey === "islam" ? "accent" : "plain"} />
      </div>
      <p className="mt-4 text-xs leading-5 text-subtle">
        Striking is context-adjusted with a manual skill prior, opponent quality, and pound-for-pound context.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-line bg-surface/65 p-3">
      <p className="mono-label">{label}</p>
      <p className="data-text mt-2 text-2xl text-foreground">{value}</p>
    </div>
  );
}

function Score({ label, value, tone = "plain" }: { label: string; value: number; tone?: "accent" | "plain" }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{label}</span>
        <span className={`data-text text-sm ${tone === "accent" ? "text-accent" : "text-foreground"}`}>{value}</span>
      </div>
      <div className="h-2 bg-surface-2">
        <div className={`h-2 ${tone === "accent" ? "bg-accent" : "bg-muted"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ReadLadder() {
  const cards = [
    {
      index: "01",
      title: "control route held.",
      body: "The pre-fight route with the strongest signal was Islam turning entries into control minutes."
    },
    {
      index: "02",
      title: "volume route broke.",
      body: "JDM's boxing volume was real, but the takedown threat changed how cleanly those minutes could stack."
    },
    {
      index: "03",
      title: "late data is confidence.",
      body: "Sparse late-round history lowers certainty in the model; it does not mark a fighter as weak late."
    }
  ];

  return (
    <section className="mt-6 grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div key={card.index} className="border border-line bg-background/45 p-5">
          <p className="data-text text-xs text-accent">{card.index}</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{card.title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{card.body}</p>
        </div>
      ))}
    </section>
  );
}

function ForecastRow({ row }: { row: (typeof backtest.comparisons)[number] }) {
  const preMax = Math.max(row.islam, row.jdm, 1);
  const actualMax = Math.max(row.actualIslam, row.actualJdm, 1);
  const confirmed = row.read === "confirmed";

  return (
    <div className="grid gap-4 border-t border-line p-4 lg:grid-cols-[180px_1fr_1fr_150px] lg:items-center">
      <div>
        <p className="font-semibold tracking-tight">{row.label}</p>
        <p className="data-text mt-1 text-xs text-subtle">{row.unit}</p>
      </div>

      <ComparisonBars
        label="pre-fight model"
        islam={row.islam}
        jdm={row.jdm}
        max={preMax}
        islamLabel={`${row.islam}`}
        jdmLabel={`${row.jdm}`}
      />

      <ComparisonBars
        label="actual fight"
        islam={row.actualIslam}
        jdm={row.actualJdm}
        max={actualMax}
        islamLabel={`${row.actualIslam}`}
        jdmLabel={`${row.actualJdm}`}
      />

      <div
        className={`border px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] ${
          confirmed ? "border-accent/30 bg-accent-soft text-accent" : "border-line bg-background/55 text-muted"
        }`}
      >
        {confirmed ? "confirmed" : "flipped"}
      </div>
    </div>
  );
}

function ComparisonBars({
  label,
  islam,
  jdm,
  max,
  islamLabel,
  jdmLabel
}: {
  label: string;
  islam: number;
  jdm: number;
  max: number;
  islamLabel: string;
  jdmLabel: string;
}) {
  return (
    <div>
      <p className="mono-label mb-3">{label}</p>
      <div className="space-y-2">
        <div className="grid grid-cols-[64px_1fr_40px] items-center gap-3">
          <span className="data-text text-xs text-accent">islam</span>
          <div className="h-2 bg-background">
            <div className="h-2 bg-accent" style={{ width: `${(islam / max) * 100}%` }} />
          </div>
          <span className="data-text text-xs text-muted">{islamLabel}</span>
        </div>
        <div className="grid grid-cols-[64px_1fr_40px] items-center gap-3">
          <span className="data-text text-xs text-muted">jdm</span>
          <div className="h-2 bg-background">
            <div className="h-2 bg-muted" style={{ width: `${(jdm / max) * 100}%` }} />
          </div>
          <span className="data-text text-xs text-muted">{jdmLabel}</span>
        </div>
      </div>
    </div>
  );
}

function ActualRoundChart() {
  const maxMargin = Math.max(...backtest.actual.rounds.map((round) => Math.abs(round.marginToIslam)), 1);

  return (
    <div className="module-card">
      <div className="module-header">
        <p className="mono-label">actual fight / round dominance</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">control stayed live.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Dominance score per round = sig strikes landed + control seconds / 30 + takedowns * 5.
          Islam won every round by the model because control time kept scoring pressure active.
        </p>
      </div>

      <div className="module-body space-y-4">
        {backtest.actual.rounds.map((round) => (
          <div key={round.round} className="grid gap-3 md:grid-cols-[70px_1fr_220px] md:items-center">
            <p className="data-text text-sm text-subtle">rd {round.round}</p>
            <div className="h-4 bg-background">
              <div
                className="h-4 bg-accent"
                style={{ width: `${(Math.abs(round.marginToIslam) / maxMargin) * 100}%` }}
              />
            </div>
            <p className="data-text text-xs text-muted">
              islam +{round.marginToIslam} · ctrl {formatControl(round.islam.controlSeconds)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActualTotals() {
  const actual = backtest.actual.totals;

  return (
    <div className="module-card">
      <div className="module-header">
        <p className="mono-label">actual result</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">50-45 control result.</h2>
      </div>
      <div className="grid md:grid-cols-4">
        <Metric label="islam sig" value={`${actual.islam.sigLanded}/${actual.islam.sigAttempts}`} />
        <Metric label="jdm sig" value={`${actual.jdm.sigLanded}/${actual.jdm.sigAttempts}`} />
        <Metric label="islam td" value={`${actual.islam.takedowns}/${actual.islam.takedownAttempts}`} />
        <Metric label="control" value={`${formatControl(actual.islam.controlSeconds)} / ${formatControl(actual.jdm.controlSeconds)}`} />
      </div>
    </div>
  );
}

export default function IslamJdmBacktestPage() {
  const actual = backtest.actual.totals;

  return (
    <>
      <AppHeader />
      <main className="section-shell py-6 md:py-10">
        <Link href="/" className="font-mono text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground">
          back to overview
        </Link>

        <section className="mt-6 border border-line bg-surface shadow-glow">
          <div className="border-b border-line p-5 md:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <PrototypeBadge />
              <p className="mono-label">backtest / sourced from ufcstats</p>
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[0.96] tracking-[-0.055em] md:text-7xl">
              islam vs. jdm
              <span className="block text-accent">forecast vs actual.</span>
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted md:text-lg md:leading-8">
              {backtest.fight.keyRead}
            </p>
          </div>

          <div className="grid md:grid-cols-3">
            <Metric label="event" value={backtest.event.name} />
            <Metric label="date" value={backtest.event.date} />
            <Metric label="result" value={`${backtest.actual.method} · r${backtest.actual.round}`} />
          </div>
        </section>

        <ReadLadder />

        <div className="mt-6">
          <CreatorCardSamples
            fightLabel="islam vs. jdm"
            eventLabel={backtest.event.name}
            keyRead={backtest.fight.keyRead}
            resultLabel={`${backtest.actual.method} · r${backtest.actual.round} · ${backtest.actual.time}`}
            metrics={[
              { label: "islam sig", value: `${actual.islam.sigLanded}/${actual.islam.sigAttempts}` },
              { label: "jdm sig", value: `${actual.jdm.sigLanded}/${actual.jdm.sigAttempts}` },
              { label: "control", value: `${formatControl(actual.islam.controlSeconds)} / ${formatControl(actual.jdm.controlSeconds)}` }
            ]}
          />
        </div>

        <section className="module-card mt-6">
          <div className="module-header">
            <p className="mono-label">pre-fight model vs actual</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">what held, what broke.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              The model does not declare a winner. It maps routes. Here, the control route held; the
              JDM volume route flipped once wrestling pressure shaped the exchanges.
            </p>
          </div>
          <div>
            {backtest.comparisons.map((row) => (
              <ForecastRow key={row.label} row={row} />
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <ActualRoundChart />
          <ActualTotals />
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <FighterSummary fighterKey="islam" />
          <FighterSummary fighterKey="jdm" />
        </section>

        <section className="module-card mt-6">
          <div className="module-body">
            <p className="mono-label">model guardrails</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {backtest.modelingNotes.map((note) => (
                <p key={note} className="border border-line bg-background/45 p-4 text-sm leading-6 text-muted">
                  {note}
                </p>
              ))}
            </div>
          </div>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
