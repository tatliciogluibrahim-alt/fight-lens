import type { NormalizedFighter } from "@/lib/normalized-event";
import { CountryFlag } from "./CountryFlag";

interface FighterAssetSlotProps {
  fighter: NormalizedFighter | null | undefined;
  fallbackName: string;
  fallbackCountry?: CountryAsset | null;
  tone?: "accent" | "muted";
  align?: "left" | "right";
}

interface CountryAsset {
  code?: string;
  label?: string;
  colors?: string[];
}

type FighterWithCountry = NormalizedFighter & {
  country?: CountryAsset | null;
};

const defaultColors = ["#c85b3f", "#f5efe6", "#403a31"];

function getCountry(fighter: NormalizedFighter | null | undefined): CountryAsset | null {
  return (fighter as FighterWithCountry | null | undefined)?.country ?? null;
}

function PortraitFallback({
  country,
  tone
}: {
  country: CountryAsset | null;
  tone: "accent" | "muted";
}) {
  const colors = country?.colors?.length ? country.colors : defaultColors;
  const isAccent = tone === "accent";

  return (
    <div
      aria-hidden="true"
      className={`relative h-36 w-28 overflow-hidden rounded-lg border ${
        isAccent ? "border-accent/35 bg-accent-soft" : "border-line-strong bg-surface-2"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.18),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_40%)]" />
      <div className={`absolute inset-x-0 bottom-0 h-24 ${isAccent ? "bg-accent/12" : "bg-foreground/7"}`} />
      <div className={`absolute left-1/2 top-10 size-14 -translate-x-1/2 rounded-full ${isAccent ? "bg-accent/22" : "bg-foreground/12"}`} />
      <div className="absolute left-1/2 top-12 size-10 -translate-x-1/2 rounded-full bg-background/70 shadow-[0_0_0_1px_rgba(245,239,230,0.1)]" />
      <div className="absolute bottom-0 left-1/2 h-20 w-28 -translate-x-1/2 rounded-t-[44px] bg-background/78 shadow-[0_0_0_1px_rgba(245,239,230,0.08)]" />
      <div className={`absolute -left-8 bottom-10 h-16 w-40 -rotate-12 ${isAccent ? "bg-accent/16" : "bg-foreground/7"}`} />
      <span className="absolute right-2 top-2">
        <CountryFlag code={country?.code ?? "TBD"} colors={colors} label={country?.label} />
      </span>
      <span className="absolute bottom-2 left-2 right-2 rounded-full border border-foreground/10 bg-background/60 px-2 py-1 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-subtle">
        photo pending
      </span>
    </div>
  );
}

export function FighterAssetSlot({
  fighter,
  fallbackName,
  fallbackCountry,
  tone = "accent",
  align = "left"
}: FighterAssetSlotProps) {
  const imageUrl = fighter?.image?.url;
  const isRight = align === "right";
  const country = getCountry(fighter) ?? fallbackCountry ?? null;

  return (
    <div className={`flex items-center gap-4 ${isRight ? "lg:flex-row-reverse" : ""}`}>
      <div className="relative overflow-hidden rounded-xl border border-line-strong bg-background/65 p-2">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={fighter?.name ?? fallbackName} className="h-36 w-28 object-cover grayscale" />
        ) : (
          <PortraitFallback country={country} tone={tone} />
        )}
      </div>
      <div className={isRight ? "lg:text-right" : ""}>
        <p className="mono-label">{country?.label ?? "asset slot"}</p>
        <p className="mt-1 max-w-[18ch] text-xs leading-5 text-subtle">
          {imageUrl ? "licensed image loaded" : "fighter photo placeholder"}
        </p>
      </div>
    </div>
  );
}
