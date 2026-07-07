import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DisclaimerFooter } from "@/components/DisclaimerFooter";

export const metadata: Metadata = {
  title: "Case Study | Fight Lens",
  description:
    "Fight Lens is a prototype for transparent MMA fight analysis, pre-fight calls that are explainable, logged, and scored. Portfolio case study and product decisions.",
};

// ─── Data ────────────────────────────────────────────────────────────────────
// All copy lives in arrays so the page reads top-to-bottom and stays scannable.
// Same Phase 1/2 vocabulary: pre-fight call, model lean, style fingerprint,
// counter path, manual context, public call record, directional, prototype.

const modules = [
  {
    label: "pre-fight call",
    body: "Fighter name + win probability, logged before the bell. Never edited after the result is known.",
  },
  {
    label: "confidence range",
    body: "Honest range around the call, scaled by how thin the underlying sample is. Not a statistical CI.",
  },
  {
    label: "why it leans",
    body: "The 2–3 reasons the model leans this way, in plain language. No black-box outputs.",
  },
  {
    label: "counter path",
    body: "The realistic way the other fighter still wins. Keeps the read accountable to both sides.",
  },
  {
    label: "style fingerprint",
    body: "A radar of style signals on a shared 0–100 spine. Style map only, not a winner forecast.",
  },
  {
    label: "manual context",
    body: "Fight-week factors the model cannot see (age, weight cut, short notice). Clearly flagged as not in model.",
  },
  {
    label: "public call record",
    body: "Every call logged pre-fight and scored after the official result. Separated from historical validation.",
  },
];

const whatItIs = [
  "A transparent fight analysis prototype",
  "A public call logging system",
  "A style and matchup explanation tool",
  "A portfolio exploration of trust in predictive sports UX",
];

const whatItIsNot = [
  "Betting advice",
  "A guaranteed prediction engine",
  "A fully automated data product",
  "A replacement for expert scouting",
  "A claim of long-term model profitability",
];

const portfolioScreens = [
  {
    href: "/",
    label: "Home / thesis",
    blurb: "Above-the-fold framing of the product and what it tracks.",
  },
  {
    href: "/events",
    label: "Current card",
    blurb: "Card-level scan with status pills, model leans, and result chips.",
  },
  {
    href: "/events/ufc-freedom-250/topuria-gaethje",
    label: "Fight detail",
    blurb: "Pre-fight call, confidence range, why it leans, counter path, finish lean.",
  },
  {
    href: "/events/ufc-freedom-250/pereira-gane",
    label: "Style fingerprint",
    blurb: "Radar comparison, fingerprint read, and a counter-style swing card.",
  },
  {
    href: "/record",
    label: "Public call record",
    blurb: "Ledger view: calls logged, correct, accuracy, completed cards, pending.",
  },
  {
    href: "/methodology",
    label: "Methodology / trust",
    blurb: "How the model reads a matchup, what it doesn't know, how calls are scored.",
  },
];

const nextDecisions = [
  {
    tag: "01",
    title: "Freeze as portfolio artifact",
    body: "Preserve 2–3 polished cards and the methodology story. Use Fight Lens as a finished prototype case study, no further product expansion.",
  },
  {
    tag: "02",
    title: "Simplify into creator tool",
    body: "A manual fight-card generator for MMA creators and analysts. The model becomes a tool for explaining a card, not predicting it at scale.",
  },
  {
    tag: "03",
    title: "Scale only with reliable data",
    body: "Move forward only with official / licensed stats, an automated outcome pipeline, and a published baseline. Don't grow before the data does.",
  },
];

const futureWedges = [
  {
    label: "creator tool",
    body: "Fight card generator for MMA podcasters, video creators, and analysts.",
  },
  {
    label: "public ledger",
    body: "Newsletter / ledger of weekly logged calls with structured post-fight grading.",
  },
  {
    label: "deeper model",
    body: "Backed by licensed feeds, opponent-tier modeling, and a published comparison baseline.",
  },
];

// ─── Small atoms ─────────────────────────────────────────────────────────────

function SectionLabel({ kicker, title, lede }: { kicker: string; title: string; lede?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="mono-label accent-rail">{kicker}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">{title}</h2>
      {lede ? <p className="mt-3 text-sm leading-6 text-muted md:text-base md:leading-7">{lede}</p> : null}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CaseStudyPage() {
  return (
    <>
      <AppHeader />
      <main>
        {/* ── 1. Hero / thesis ───────────────────────────────────────────── */}
        <section className="section-shell py-10 md:py-16">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.14em] text-subtle hover:text-foreground"
          >
            ← back
          </Link>

          <div className="mt-8 max-w-4xl">
            <p className="mono-label accent-rail">case study · prototype notes</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[0.95] tracking-[-0.05em] md:text-6xl">
              transparent fight analysis,
              <span className="block text-accent">accountable by design.</span>
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-muted md:text-lg md:leading-8">
              Fight Lens is a prototype for transparent MMA fight analysis, designed to turn
              pre-fight predictions into explainable, logged, and scored calls. This page is the
              short version of why it exists, what it does, and where it could go next.
            </p>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle/70">portfolio prototype</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle/70">not betting advice</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle/70">model lean · not a guarantee</span>
            </div>
          </div>
        </section>

        {/* ── 2. Problem ─────────────────────────────────────────────────── */}
        <section className="section-shell py-6 md:py-10">
          <SectionLabel
            kicker="problem"
            title="MMA analysis is fragmented. Predictions disappear."
            lede="Stats live on one site. Podcasts and social chatter live somewhere else. Betting markets sit on top. After the fight, most takes disappear. There is no clean way to see who was right, who was wrong, and why."
          />
        </section>

        {/* ── 3. Product insight ─────────────────────────────────────────── */}
        <section className="section-shell py-6 md:py-10">
          <div className="rounded-2xl border border-line bg-surface/60 p-6 md:p-8">
            <p className="mono-label">product insight</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
              the hard part is trust, not prediction accuracy.
            </h2>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-muted md:grid-cols-2 md:text-base md:leading-7">
              <li className="flex gap-2"><span className="text-accent">·</span> What the model thinks</li>
              <li className="flex gap-2"><span className="text-accent">·</span> Why it leans that way</li>
              <li className="flex gap-2"><span className="text-accent">·</span> What could break the call</li>
              <li className="flex gap-2"><span className="text-accent">·</span> What context sits outside the model</li>
              <li className="flex gap-2"><span className="text-accent">·</span> Whether past calls were right or wrong</li>
            </ul>
          </div>
        </section>

        {/* ── 4. Prototype system, 7 modules ─────────────────────────────── */}
        <section className="section-shell py-6 md:py-10">
          <SectionLabel
            kicker="prototype system"
            title="seven modules. one argument."
            lede="Every fight page is built from the same set of explainable units. Each one has a single job."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((m, i) => (
              <article key={m.label} className="rounded-2xl border border-line bg-surface/70 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="mono-label text-foreground">{m.label}</p>
                  <span className="data-text text-[10px] uppercase tracking-[0.12em] text-subtle">
                    0{i + 1}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{m.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── 5. Constraint / hard decision ──────────────────────────────── */}
        <section className="section-shell py-6 md:py-10">
          <div className="rounded-2xl border border-line bg-background/35 p-6 md:p-8">
            <p className="mono-label">constraint · hard decision</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
              data maintenance was the real bottleneck.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted md:text-base md:leading-7">
              The biggest constraint was data quality and maintenance. MMA data is fragmented and
              context-heavy, so the prototype was reframed around transparent analysis and
              accountability rather than pretending to be a fully automated production model.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted md:text-base md:leading-7">
              The mature decision was to stop short of a scraper and a database, and to build the
              parts that actually carry the product story: trust, scoring, and explanation.
            </p>
          </div>
        </section>

        {/* ── 6. What this is / what this is not ─────────────────────────── */}
        <section className="section-shell py-6 md:py-10">
          <SectionLabel kicker="scope" title="what this is, and what it is not." />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface/70 p-6">
              <p className="mono-label text-foreground">what this is</p>
              <ul className="mt-4 space-y-2.5 text-sm leading-6 text-muted">
                {whatItIs.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-background/35 p-6">
              <p className="mono-label text-foreground">what this is not</p>
              <ul className="mt-4 space-y-2.5 text-sm leading-6 text-muted">
                {whatItIsNot.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-subtle/50" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 7. Portfolio screens ───────────────────────────────────────── */}
        <section className="section-shell py-6 md:py-10">
          <SectionLabel
            kicker="portfolio screens"
            title="the strongest surfaces to look at."
            lede="Six screens that carry the case. Tap any card to open the live screen."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {portfolioScreens.map((screen, i) => (
              <Link
                key={screen.href}
                href={screen.href}
                className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface/70 p-5 transition hover:border-accent/40 hover:bg-surface"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="data-text text-sm text-subtle">0{i + 1}</p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle group-hover:text-accent">
                    open →
                  </span>
                </div>
                <p className="text-base font-semibold leading-tight tracking-tight text-foreground">
                  {screen.label}
                </p>
                <p className="text-sm leading-6 text-muted">{screen.blurb}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 8. Next decisions ──────────────────────────────────────────── */}
        <section className="section-shell py-6 md:py-10">
          <SectionLabel
            kicker="next decision"
            title="freeze, simplify, or scale."
            lede="Three credible paths from here. Each implies a different commitment to data infrastructure."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {nextDecisions.map((d) => (
              <article key={d.tag} className="rounded-2xl border border-line bg-surface/70 p-5">
                <p className="data-text text-sm text-subtle">{d.tag}</p>
                <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">{d.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{d.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── 9. Future wedge ────────────────────────────────────────────── */}
        <section className="section-shell py-6 md:py-10">
          <div className="rounded-2xl border border-line bg-background/35 p-6 md:p-8">
            <p className="mono-label">future wedge</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
              three credible product paths.
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {futureWedges.map((w) => (
                <div key={w.label} className="rounded-xl border border-line bg-background/40 p-4">
                  <p className="mono-label text-foreground">{w.label}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{w.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. Current recommendation ─────────────────────────────────── */}
        <section className="section-shell py-6 md:py-12">
          <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-surface via-surface/95 to-surface-2/80 p-6 md:p-8">
            <p className="mono-label accent-rail">current recommendation</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
              portfolio-grade prototype. not a production product.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted md:text-base md:leading-7">
              Fight Lens stands as a polished prototype: a transparent fight analysis surface,
              a public call ledger, and a clear example of when not to overbuild. Any next move
              should be driven by data infrastructure and audience, not by feature ambition.
            </p>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle/70">
              prototype note · exploratory product concept focused on transparent sports analysis and accountable model UX
            </p>
          </div>
        </section>
      </main>
      <DisclaimerFooter />
    </>
  );
}
