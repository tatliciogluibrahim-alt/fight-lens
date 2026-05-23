import Link from "next/link";

export function DisclaimerFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-background/55">
      <div className="section-shell flex flex-col gap-5 py-8 text-sm text-muted md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-semibold tracking-[-0.02em] text-foreground">fight lens</p>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">
            directional model lean · not a guarantee
          </p>
          <p className="mt-2 max-w-md text-xs leading-5 text-subtle/80">
            Prototype note: Fight Lens is an exploratory product concept focused on transparent
            sports analysis and accountable model UX.
          </p>
        </div>
        <div className="max-w-xl text-xs leading-6 text-subtle md:text-right">
          <p>
            Independent matchup analysis. Not affiliated with the UFC. Calls are logged before
            each fight and scored after the official result.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 md:justify-end">
            <Link href="/case-study" className="text-subtle underline decoration-line underline-offset-4 hover:text-foreground">
              case study →
            </Link>
            <Link href="/methodology" className="text-subtle underline decoration-line underline-offset-4 hover:text-foreground">
              how the model works →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
