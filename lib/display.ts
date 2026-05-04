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

export function getCountryDisplay(fighter: { name: string; country?: CountryDisplay | null }) {
  return fighter.country ?? fighterCountryFallbacks[fighter.name] ?? null;
}
