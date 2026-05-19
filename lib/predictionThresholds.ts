export const NAMED_CALL_MIN_PROBABILITY = 52;

export type PredictionSide = "fighterA" | "fighterB";

export function getNamedCallSide(
  fighterAWinProbability: number,
  fighterBWinProbability: number,
): PredictionSide | null {
  const topProbability = Math.max(fighterAWinProbability, fighterBWinProbability);
  if (topProbability < NAMED_CALL_MIN_PROBABILITY) return null;
  if (fighterAWinProbability === fighterBWinProbability) return null;
  return fighterAWinProbability > fighterBWinProbability ? "fighterA" : "fighterB";
}

export function isTooCloseToCall(
  fighterAWinProbability: number,
  fighterBWinProbability: number,
): boolean {
  return getNamedCallSide(fighterAWinProbability, fighterBWinProbability) === null;
}
