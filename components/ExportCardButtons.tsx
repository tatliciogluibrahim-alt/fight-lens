import type { Fight, Fighter } from "@/lib/types";
import { CountryFlag } from "./CountryFlag";

interface ExportCardButtonsProps {
  fight: Fight;
  fighterA: Fighter;
  fighterB: Fighter;
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-line bg-background/60 p-3">
      <p className="mono-label">{label}</p>
      <p className="data-text mt-2 text-xl text-foreground">{value}</p>
    </div>
  );
}

export function ExportCardButtons({ fight, fighterA, fighterB }: ExportCardButtonsProps) {
  return (
    <section id="creator-cards" className="module-card scroll-mt-28">
      <div className="module-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono-label">07 / creator cards</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
            make the read portable.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            These are richer sample cuts for thumbnails, X posts, and reels. The overlap card above
            is the main export candidate; these show how the same read can collapse into content.
          </p>
        </div>
      </div>

      <div className="module-body grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="aspect-video border border-line bg-background p-5 md:p-7">
          <div className="flex h-full flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="mono-label">fight lens / overlap cut</p>
              <p className="data-text text-xs text-subtle">1920 x 1080</p>
            </div>

            <div>
              <div className="mb-4 flex items-center gap-3">
                <CountryFlag code={fighterA.countryCode} colors={fighterA.countryColors} label={fighterA.countryLabel} size="md" />
                <span className="data-text text-xs text-subtle">vs</span>
                <CountryFlag code={fighterB.countryCode} colors={fighterB.countryColors} label={fighterB.countryLabel} size="md" />
              </div>
              <p className="data-text text-sm text-accent">{fighterA.name.toLowerCase()} vs. {fighterB.name.toLowerCase()}</p>
              <h3 className="mt-3 max-w-3xl text-4xl font-semibold leading-[0.92] tracking-[-0.055em] md:text-6xl">
                {fight.styleClashLabel}.
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MiniMetric label="a control" value={fighterA.styleProfile.controlThreat} />
              <MiniMetric label="b output" value={fighterB.styleProfile.strikingVolume} />
              <MiniMetric label="rounds" value={fight.rounds} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="aspect-[9/16] border border-line bg-surface-2 p-5">
            <div className="flex h-full flex-col justify-between">
              <p className="mono-label">story cut / 9:16</p>
              <div>
                <p className="data-text text-xs text-accent">{fight.weightClass.toLowerCase()}</p>
                <h3 className="mt-3 text-4xl font-semibold leading-[0.94] tracking-[-0.055em]">
                  one matchup. seven reads.
                </h3>
              </div>
              <p className="text-sm leading-6 text-muted">{fight.fightShapeSummary}</p>
            </div>
          </div>

          <div className="min-h-64 border border-line bg-background/55 p-5">
            <div className="flex h-full flex-col justify-between gap-8">
              <p className="mono-label">quote card</p>
              <h3 className="text-3xl font-semibold leading-none tracking-[-0.05em]">
                short fight or long fight. nothing in between.
              </h3>
              <p className="data-text text-xs text-subtle">
                fight lens · creator card
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
