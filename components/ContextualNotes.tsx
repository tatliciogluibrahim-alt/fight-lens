import type { ContextualFightNote } from "@/lib/sourced-event";

/*
 * No color-coded direction chips here. The success/wrong palette belongs to
 * scored outcomes only. Context notes explicitly do not change the model call,
 * so treating "hurts" as red and "helps" as green creates a false parallel
 * signal. All chips use the same neutral treatment, copy carries the meaning.
 *
 * Chip order: confidence first (more meaningful), direction second (qualifier).
 */

const CHIP = "rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em]";

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
              {/* Confidence leads, it tells you how much weight to put on the note */}
              <span className={`${CHIP} text-muted`}>
                {note.confidence}
              </span>
              {/* Direction is a qualifier, not a verdict, same neutral styling */}
              <span className={`${CHIP} text-subtle`}>
                {note.impactDirection}
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
