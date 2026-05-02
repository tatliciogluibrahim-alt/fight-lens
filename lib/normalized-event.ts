import normalizedEvent from "@/data/normalized/events/ufc-328.json";

export type NormalizedEvent = typeof normalizedEvent;
export type NormalizedFight = NormalizedEvent["fights"][number];
export type NormalizedFighter = NormalizedFight["fighters"]["fighterA"];

export function getNormalizedFight(fightId: string): NormalizedFight | undefined {
  return normalizedEvent.fights.find((fight) => fight.id === fightId);
}

export { normalizedEvent };
