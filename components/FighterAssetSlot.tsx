import type { SourcedFighter } from "@/lib/sourced-event";
import { getCountryDisplay } from "@/lib/display";

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

function flagEmojiFromCode(code: string | undefined): string | null {
  if (!code) return null;
  const first = code.split("/")[0].trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(first)) return null;
  return Array.from(first)
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function PortraitFallback({
  country,
  tone
}: {
  country: CountryAsset | null;
  tone: "accent" | "muted";
}) {
  const isAccent = tone === "accent";
  const emoji = flagEmojiFromCode(country?.code);
  const abbr = country?.code?.split("/")[0].trim().toUpperCase() ?? null;

  return (
    <div
      aria-hidden="true"
      className={`relative flex h-36 w-28 items-center justify-center overflow-hidden rounded-lg border ${
        isAccent ? "border-accent/35 bg-accent-soft" : "border-line-strong bg-surface-2"
      }`}
    >
      {emoji ? (
        <span className="select-none text-5xl leading-none">{emoji}</span>
      ) : abbr ? (
        <span className={`select-none font-mono text-2xl font-semibold ${isAccent ? "text-accent" : "text-muted"}`}>
          {abbr}
        </span>
      ) : null}
    </div>
  );
}

export function FighterAssetSlot({
  fighter,
  fallbackName,
  fallbackCountry,
  tone = "accent",
}: FighterAssetSlotProps) {
  const imageUrl = fighter?.image?.url;
  const country = getCountry(fighter) ?? fallbackCountry ?? null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-line-strong bg-background/65 p-2">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={fighter?.name ?? fallbackName} className="h-36 w-28 object-cover grayscale" />
      ) : (
        <PortraitFallback country={country} tone={tone} />
      )}
    </div>
  );
}
