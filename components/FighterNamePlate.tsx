interface FighterNamePlateProps {
  name: string;
  align?: "left" | "right";
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function splitBalanced(parts: string[]): [string[], string[]] {
  if (parts.length <= 1) return [parts, []];
  if (parts.length === 2) return [[parts[0]], [parts[1]]];

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

  return [parts.slice(0, bestIndex), parts.slice(bestIndex)];
}

function splitFighterName(name: string) {
  const parts = normalizeName(name).split(" ").filter(Boolean);
  const [firstLine, secondLine] = splitBalanced(parts);

  return {
    mobileLines: parts.length > 0 ? parts : [name],
    desktopLines: [firstLine.join(" "), secondLine.join(" ")].filter(Boolean),
  };
}

export function FighterNamePlate({ name, align = "left" }: FighterNamePlateProps) {
  const { mobileLines, desktopLines } = splitFighterName(name);
  const textAlign = align === "right" ? "lg:items-end lg:text-right" : "items-start text-left";

  return (
    <h2
      aria-label={name}
      className={`flex min-h-[7.5rem] flex-col justify-center overflow-visible text-[2.65rem] font-semibold leading-[0.9] tracking-normal sm:text-[3.1rem] md:min-h-[8rem] md:text-[4.1rem] lg:min-h-[8.75rem] lg:text-[4.55rem] xl:text-[5rem] ${textAlign}`}
    >
      <span aria-hidden="true" className="flex flex-col md:hidden">
        {mobileLines.map((line, index) => (
          <span key={`mobile-${line}-${index}`} className="block whitespace-nowrap">
            {line}
          </span>
        ))}
      </span>
      <span aria-hidden="true" className="hidden flex-col md:flex">
        {desktopLines.map((line, index) => (
          <span key={`desktop-${line}-${index}`} className="block whitespace-nowrap">
            {line}
          </span>
        ))}
      </span>
    </h2>
  );
}
