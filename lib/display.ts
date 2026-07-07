export function formatRanking(ranking: string | null | undefined) {
  const value = ranking?.trim();

  if (!value || value.toLowerCase() === "nr") {
    return "UNRANKED";
  }

  if (value.toUpperCase() === "C") {
    return "CHAMPION";
  }

  return value.toUpperCase();
}

export function formatStyleClashLabel(label: string | null | undefined) {
  return label?.trim().toUpperCase() ?? "MATCHUP SHAPE PENDING";
}

interface CountryDisplay {
  code?: string;
  label?: string;
  colors?: string[];
}

const fighterCountryFallbacks: Record<string, CountryDisplay> = {
  "Khamzat Chimaev": { code: "AE/SE", label: "uae / sweden" },
  "Sean Strickland": { code: "US", label: "united states" },
  "Joshua Van": { code: "MM", label: "myanmar" },
  "Tatsuro Taira": { code: "JP", label: "japan" },
  "Alexander Volkov": { code: "RU", label: "russia" },
  "Waldo Cortes Acosta": { code: "DO", label: "dominican republic" },
  "Sean Brady": { code: "US", label: "united states" },
  "Joaquin Buckley": { code: "US", label: "united states" },
  "King Green": { code: "US", label: "united states" },
  "Jeremy Stephens": { code: "US", label: "united states" },
  "Ateba Gautier": { code: "CM", label: "cameroon" },
  "Ozzy Diaz": { code: "US", label: "united states" },
  "Joel Alvarez": { code: "ES", label: "spain" },
  "Yaroslav Amosov": { code: "UA", label: "ukraine" },
  "Grant Dawson": { code: "US", label: "united states" },
  "Mateusz Rebecki": { code: "PL", label: "poland" },
  "Jim Miller": { code: "US", label: "united states" },
  "Jared Gordon": { code: "US", label: "united states" },
  "Roman Kopylov": { code: "RU", label: "russia" },
  "Marco Tulio": { code: "BR", label: "brazil" },
  "Pat Sabatini": { code: "US", label: "united states" },
  "William Gomis": { code: "FR", label: "france" },
  "Baisangur Susurkaev": { code: "RU", label: "russia" },
  "Djorden Santos": { code: "BR", label: "brazil" },
  "Clayton Carpenter": { code: "US", label: "united states" },
  "Jose Ochoa": { code: "PE", label: "peru" }
};

export function getCountryDisplay(fighter: {
  name: string;
  /** Stable ids when available — surfaced in the dev warning so a miss is traceable. */
  id?: string;
  ufcstatsId?: string;
  country?: CountryDisplay | null;
}) {
  // Sourced country data always wins.
  if (fighter.country) return fighter.country;

  const fallback = fighterCountryFallbacks[fighter.name] ?? null;

  // A silent null here renders "country pending" forever with no signal to fix
  // it. Make the miss observable in dev so a new fighter gets a fallback added.
  if (!fallback && process.env.NODE_ENV !== "production") {
    const idHint = fighter.id ?? fighter.ufcstatsId;
    console.warn(
      `[fight-lens] getCountryDisplay: no country for "${fighter.name}"` +
        (idHint ? ` (id: ${idHint})` : "") +
        ` — add a fighterCountryFallbacks entry in lib/display.ts or source country data. Rendering "country pending".`,
    );
  }

  return fallback;
}

/** Consistent bout billing, e.g. formatMatchup("Chimaev", "Strickland") → "Chimaev vs. Strickland". */
export function formatMatchup(a: string, b: string): string {
  return `${a} vs. ${b}`;
}
