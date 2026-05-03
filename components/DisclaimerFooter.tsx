import Link from "next/link";

export function DisclaimerFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-background/55">
      <div className="section-shell flex flex-col gap-5 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold tracking-[-0.02em] text-foreground">fight lens</p>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">
            see the shape of the fight
          </p>
        </div>
        <div className="max-w-xl font-mono text-xs leading-6 text-subtle md:text-right">
          <p>independent matchup intelligence. not affiliated with ufc. no odds, no picks, no betting language.</p>
          <Link href="/methodology" className="text-subtle underline decoration-line underline-offset-4 hover:text-foreground">
            methodology
          </Link>
        </div>
      </div>
    </footer>
  );
}
