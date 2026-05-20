interface FighterNamePlateProps {
  name: string;
  align?: "left" | "right";
}

function splitFighterName(name: string): [string, string] {
  const parts = name.trim().replace(/s+/g, " ").split(" ").filter(Boolean);

  if (parts.length <= 1) return [parts[0] ?? name, ""];
  if (parts.length === 2) return [parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts.slice(1).join(" ")];

  let bestIndex = 1;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (let i = 1; i < parts.length; i += 1) {
    const first = parts.slice(0, i).join(" ");
    const second = parts.slice(i).join(" ");
    const delta = Math.abs(first.length - second.length);

    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = i;
    }
  }

  return [parts.slice(0, bestIndex).join(" "), parts.slice(bestIndex).join(" ")];
}

export function FighterNamePlate({ name, align = "left" }: FighterNamePlateProps) {
  const [lineOne, lineTwo] = splitFighterName(name);
  const hasSecondLine = lineTwo.length > 0;

  return (
    <h2
      aria-label={name}
      className={`min-h-[5rem] text-[clamp(2.45rem,10vw,4.15rem)] font-semibold leading-[0.92] tracking-normal text-balance md:min-h-[7.5rem] md:text-[clamp(3.75rem,7vw,5rem)] lg:min-h-[8.75rem] ${
        align === "right" ? "lg:text-right" : "text-left"
      }`}
    >
      <span aria-hidden="true" className="block break-words">
        {lineOne}
      </span>
      <span
        aria-hidden="true"
        className={`block break-words ${hasSecondLine ? "" : "select-none opacity-0"}`}
      >
        {hasSecondLine ? lineTwo : lineOne}
      </span>
    </h2>
  );
}
