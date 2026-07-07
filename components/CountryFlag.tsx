interface CountryFlagProps {
  code: string;
  label?: string;
  size?: "sm" | "md";
}

function flagEmoji(countryCode: string) {
  const normalized = countryCode.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized)) {
    return normalized === "TBD" ? ", " : normalized.slice(0, 3);
  }

  return Array.from(normalized)
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function CountryFlag({ code, label, size = "sm" }: CountryFlagProps) {
  const dimensions = size === "md" ? "min-h-7 min-w-10 px-2 text-base" : "min-h-5 min-w-7 px-1.5 text-xs";
  const codes = code
    .split("/")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return (
    <span
      aria-label={label ? `${label} country marker` : `${code} country marker`}
      title={label ?? code}
      className="inline-flex shrink-0 items-center gap-0.5 align-middle"
    >
      {codes.map((countryCode) => (
        <span
          key={countryCode}
          className={`${dimensions} inline-flex items-center justify-center rounded-[4px] border border-line bg-background/65 font-mono font-semibold uppercase leading-none text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.2)]`}
        >
          {flagEmoji(countryCode)}
        </span>
      ))}
      <span className="sr-only">{code}</span>
    </span>
  );
}
