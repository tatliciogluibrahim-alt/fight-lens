import type { ContextualFightNote } from "@/lib/sourced-event";

function toneFor(direction: ContextualFightNote["impactDirection"]) {
  switch (direction) {
    case "helps":
      return "border-success/25 bg-success-soft text-success";
    case "hurts":
      return "border-wrong/25 bg-wrong-soft text-wrong";
    case "unclear":
      return "border-line bg-surface-2 text-subtle";
  }
}

export function ContextualNotes({ notes }: { notes?: ContextualFightNote[] | null }) {
  if (!notes?.length) return null;

  return (
    <section className="module-card">
      <div className="module-header">
        <p className="mono-label">context notes</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
          manual context only.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          These notes flag fight-week context. They do not change the model call.
        </p>
      </div>
      <div className="module-body grid gap-3 md:grid-cols-2">
        {notes.map((note) => (
          <article key={`${note.fighter}-${note.type}-${note.title}`} className="rounded-2xl border border-line bg-background/35 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono-label text-foreground">{note.fighter}</span>
              <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${toneFor(note.impactDirection)}`}>
                {note.impactDirection}
              </span>
              <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-subtle">
                {note.confidence}
              </span>
            </div>
            <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">{note.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{note.explanation}</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-subtle/70">
              {note.modelImpact}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
