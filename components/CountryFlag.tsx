interface CountryFlagProps {
  code: string;
  colors: string[];
  label?: string;
  size?: "sm" | "md";
}

export function CountryFlag({ code, colors, label, size = "sm" }: CountryFlagProps) {
  const [a = "#c85b3f", b = "#f5efe6", c = "#403a31"] = colors;
  const dimensions = size === "md" ? "h-7 w-10" : "h-5 w-7";
  const codes = code
    .split("/")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return (
    <span
      aria-label={label ? `${label} flag marker` : `${code} flag marker`}
      title={label ?? code}
      className="inline-flex shrink-0 items-center gap-0.5 align-middle"
    >
      {codes.map((countryCode) => (
        <span
          key={countryCode}
          className={`${dimensions} relative inline-flex overflow-hidden rounded-[3px] border border-foreground/20 bg-surface-2 bg-cover bg-center shadow-[0_0_0_1px_rgba(0,0,0,0.22)]`}
          style={{
            backgroundImage: `linear-gradient(135deg, ${a} 0 33%, ${b} 33% 66%, ${c} 66% 100%), url("https://flagcdn.com/${countryCode}.svg")`
          }}
        >
          <span className="absolute inset-0 bg-gradient-to-b from-white/8 to-black/10" />
        </span>
      ))}
      <span className="sr-only">{code}</span>
    </span>
  );
}
