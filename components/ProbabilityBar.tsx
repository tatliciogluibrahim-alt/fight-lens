"use client";

import { useEffect, useState } from "react";

interface ProbabilityBarProps {
  probA: number;
  probB: number;
  nameA: string;
  nameB: string;
  tooClose: boolean;
}

export function ProbabilityBar({ probA, probB, nameA, nameB, tooClose }: ProbabilityBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Tiny delay so the animation is perceptible from the starting state
    const id = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(id);
  }, []);

  const aIsFav = probA >= probB;
  const favName = aIsFav ? nameA : nameB;
  const favProb = Math.max(probA, probB);

  // Color: gold for favorite, subtle for underdog; muted if tooClose
  const colorA = tooClose ? "text-muted" : aIsFav ? "text-accent" : "text-subtle";
  const colorB = tooClose ? "text-muted" : !aIsFav ? "text-accent" : "text-subtle";

  const barWidth = mounted ? `${probA}%` : "50%";

  return (
    <div className="space-y-5">
      {/* Fighter name labels */}
      <div className="flex items-center justify-between">
        <p className="mono-label">{nameA}</p>
        <p className="mono-label">vs</p>
        <p className="mono-label">{nameB}</p>
      </div>

      {/* Giant probability numbers */}
      <div className="flex items-baseline justify-between gap-4">
        <span
          className={`data-text text-[5.5rem] font-light leading-none tracking-[-0.05em] transition-colors duration-700 md:text-[8rem] lg:text-[10rem] ${colorA}`}
        >
          {probA}%
        </span>
        <span
          className={`data-text text-[5.5rem] font-light leading-none tracking-[-0.05em] transition-colors duration-700 md:text-[8rem] lg:text-[10rem] ${colorB}`}
        >
          {probB}%
        </span>
      </div>

      {/* Animated bar */}
      <div className="relative h-[3px] overflow-hidden rounded-full bg-surface-2">
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${tooClose ? "bg-subtle/40" : "bg-accent"}`}
          style={{
            width: barWidth,
            transition: mounted ? "width 1.4s cubic-bezier(0.23, 1, 0.32, 1)" : "none",
          }}
        />
      </div>

      {/* Lean label */}
      <p className="text-center mono-label">
        {tooClose
          ? "too close to call — either side viable"
          : `model leans ${favName} · ${favProb}% win probability`}
      </p>
    </div>
  );
}
