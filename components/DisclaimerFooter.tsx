import Link from "next/link";

export function DisclaimerFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-background/55">
      <div className="section-shell flex flex-col gap-5 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold tracking-[-0.02em] text-foreground">fight lens</p>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">
            signal-based forecast · not a guarantee
          </p>
        </div>
        <div className="max-w-xl text-xs leading-6 text-subtle md:text-right">
          <p>
            Independent matchup intelligence. Not affiliated with the UFC. Calls are logged before
            each fight and scored after the official result.
          </p>
          <Link href="/methodology" className="mt-1 inline-block text-subtle underline decoration-line underline-offset-4 hover:text-foreground">
            how the model works →
          </Link>
        </div>
      </div>
    </footer>
  );
}
