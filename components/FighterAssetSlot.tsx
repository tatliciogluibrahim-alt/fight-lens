import type { SourcedFighter } from "@/lib/sourced-event";
import { getCountryDisplay } from "@/lib/display";
import { CountryFlag } from "./CountryFlag";

interface FighterAssetSlotProps {
  fighter: SourcedFighter | null | undefined;
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

type FighterWithCountry = SourcedFighter & {
  country?: CountryAsset | null;
};

function getCountry(fighter: SourcedFighter | null | undefined): CountryAsset | null {
  if (!fighter) return null;
  return getCountryDisplay(fighter as FighterWithCountry);
}

function PortraitFallback({
  country,
  tone
}: {
  country: CountryAsset | null;
  tone: "accent" | "muted";
}) {
  const isAccent = tone === "accent";

  return (
    <div
      aria-hidden="true"
      className={`relative h-36 w-28 overflow-hidden rounded-lg border ${
        isAccent ? "border-accent/35 bg-accent-soft" : "border-line-strong bg-surface-2"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.08),transparent_55%)]" />
      {/* Lens aperture mark */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className={`size-12 rounded-full border-2 ${isAccent ? "border-accent/40" : "border-foreground/15"}`} />
        <div className={`absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ${isAccent ? "bg-accent/30" : "bg-foreground/12"}`} />
        <div className={`absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border ${isAccent ? "border-accent/25" : "border-foreground/10"}`} />
      </div>
      <span className="absolute right-2 top-2">
        <CountryFlag code={country?.code ?? "TBD"} label={country?.label} />
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
        <p className="mono-label">{country?.label ?? ""}</p>
      </div>
    </div>
  );
}
