import type { Event, Fight, Fighter, FightResult, StyleProfile } from "./types";

// Prototype data only. These numbers are placeholders for interface design and
// should not be presented as real UFC analysis.

const profile = (
  strikingVolume: number,
  strikingDefense: number,
  wrestlingOffense: number,
  takedownDefense: number,
  controlThreat: number,
  submissionThreat: number,
  cardioConsistency: number,
  opponentQuality: number
): StyleProfile => ({
  strikingVolume,
  strikingDefense,
  wrestlingOffense,
  takedownDefense,
  controlThreat,
  submissionThreat,
  cardioConsistency,
  opponentQuality
});

const lastFive = (seed: number): FightResult[] => {
  const opponentPools = [
    ["Marcus Vale", "Elias Prado", "Niko Sato", "Rafael Nunes", "Damon Price"],
    ["Andre Keller", "Musa Karim", "Tomas Varga", "Luis Ortega", "Kai Bennett"],
    ["Jordan Hale", "Mateo Silva", "Omar Reyes", "Felix Grant", "Samir Haddad"],
    ["Dante Brooks", "Ilya Romanov", "Aiden Park", "Victor Marin", "Noah Ellis"]
  ];
  const opponents = opponentPools[seed % opponentPools.length];

  return opponents.map((opponent, index) => {
    const result = (seed + index) % 4 === 0 ? "L" : "W";
    return {
      opponent,
      date: `202${5 - Math.min(index, 3)}-${String(9 - index).padStart(2, "0")}-12`,
      result,
      method: index % 3 === 0 ? "DEC" : index % 3 === 1 ? "KO" : "SUB",
      round: (index % 3) + 1,
      time: index % 2 === 0 ? "5:00" : "3:18",
      opponentTier: index === 0 ? "Top 10" : index < 3 ? "Ranked" : "Unranked",
      sigStrikeDifferentialByRound: [seed - 3 + index, seed + 1 - index, seed - 1],
      takedownsByRound: [index % 2, (seed + index) % 2, index === 0 ? 1 : 0],
      controlTimeByRound: [35 + seed * 4, 18 + index * 12, 44 - index * 5],
      notes: "prototype trend line"
    };
  });
};

const fighter = (
  id: string,
  name: string,
  countryCode: string,
  countryLabel: string,
  countryColors: string[],
  record: string,
  age: number,
  height: string,
  reach: string,
  stance: string,
  ranking: string,
  styleProfile: StyleProfile,
  resumeScore: number,
  seed: number,
  nickname?: string
): Fighter => ({
  id,
  name,
  nickname,
  countryCode,
  countryLabel,
  countryColors,
  record,
  age,
  height,
  reach,
  stance,
  ranking,
  styleProfile,
  lastFiveFights: lastFive(seed),
  resumeHeat: {
    score: resumeScore,
    label: resumeScore >= 85 ? "elite heat" : resumeScore >= 72 ? "ranked heat" : "building heat",
    explanation: "Prototype score built from opponent tier, recent form, finish rate, and five-round sample.",
    factors: [
      `${Math.max(1, Math.round(resumeScore / 18))} top-tier wins`,
      `${Math.max(3, Math.round(resumeScore / 11))} ranked-level looks`,
      `${Math.max(4, Math.round(resumeScore / 9))} recent form points`
    ]
  }
});

export const fighters: Record<string, Fighter> = {
  chimaev: fighter("chimaev", "Khamzat Chimaev", "AE/SE", "uae / sweden", ["#CE1126", "#F5EFE6", "#00732F"], "14-0", 31, "6'2\"", "75\"", "Orthodox", "C", profile(73, 69, 96, 82, 97, 88, 79, 86), 92, 8, "Borz"),
  strickland: fighter("strickland", "Sean Strickland", "US", "united states", ["#9B1C31", "#F5EFE6", "#243B6B"], "29-7", 35, "6'1\"", "76\"", "Orthodox", "#1", profile(86, 84, 38, 78, 42, 31, 91, 90), 89, 5),
  van: fighter("van", "Joshua Van", "MM/US", "myanmar / united states", ["#F7D116", "#34B233", "#EA2839"], "13-2", 24, "5'5\"", "65\"", "Orthodox", "#7", profile(91, 67, 45, 72, 41, 34, 83, 71), 76, 7),
  taira: fighter("taira", "Tatsuro Taira", "JP", "japan", ["#F5EFE6", "#BC002D", "#F5EFE6"], "16-1", 26, "5'7\"", "70\"", "Orthodox", "#5", profile(66, 72, 78, 74, 82, 90, 76, 78), 80, 6),
  volkov: fighter("volkov", "Alexander Volkov", "RU", "russia", ["#F5EFE6", "#3456A4", "#B72B2D"], "38-11", 37, "6'7\"", "80\"", "Orthodox", "#4", profile(79, 71, 42, 70, 45, 29, 73, 87), 84, 3),
  cortes: fighter("cortes", "Waldo Cortes-Acosta", "DO", "dominican republic", ["#CF142B", "#F5EFE6", "#002D62"], "13-1", 34, "6'4\"", "78\"", "Orthodox", "#10", profile(74, 61, 34, 66, 35, 22, 68, 65), 68, 4),
  brady: fighter("brady", "Sean Brady", "US", "united states", ["#9B1C31", "#F5EFE6", "#243B6B"], "17-1", 33, "5'9\"", "72\"", "Orthodox", "#3", profile(64, 73, 88, 77, 91, 76, 82, 83), 86, 7),
  buckley: fighter("buckley", "Joaquin Buckley", "US", "united states", ["#9B1C31", "#F5EFE6", "#243B6B"], "21-6", 32, "5'10\"", "76\"", "Southpaw", "#6", profile(88, 64, 56, 69, 54, 28, 80, 74), 78, 6),
  green: fighter("green", "King Green", "US", "united states", ["#9B1C31", "#F5EFE6", "#243B6B"], "32-16-1", 39, "5'10\"", "71\"", "Orthodox", "", profile(84, 76, 36, 70, 32, 24, 77, 82), 75, 4),
  stephens: fighter("stephens", "Jeremy Stephens", "US", "united states", ["#9B1C31", "#F5EFE6", "#243B6B"], "29-21", 39, "5'9\"", "71\"", "Orthodox", "", profile(77, 55, 29, 62, 28, 18, 65, 79), 70, 2),
  gautier: fighter("gautier", "Ateba Gautier", "FR/CM", "france / cameroon", ["#007A5E", "#FCD116", "#CE1126"], "8-1", 23, "6'3\"", "77\"", "Southpaw", "", profile(81, 58, 44, 63, 46, 38, 67, 54), 58, 5),
  diaz: fighter("diaz", "Ozzy Diaz", "US", "united states", ["#9B1C31", "#F5EFE6", "#243B6B"], "9-3", 34, "6'4\"", "76\"", "Orthodox", "", profile(73, 57, 48, 59, 50, 35, 61, 52), 55, 3),
  alvarez: fighter("alvarez", "Joel Alvarez", "ES", "spain", ["#AA151B", "#F1BF00", "#AA151B"], "22-3", 32, "6'3\"", "77\"", "Orthodox", "#13", profile(76, 60, 58, 63, 61, 89, 70, 76), 79, 8),
  amosov: fighter("amosov", "Yaroslav Amosov", "UA", "ukraine", ["#0057B7", "#FFD700", "#0057B7"], "27-1", 32, "5'11\"", "74\"", "Orthodox", "", profile(62, 78, 91, 83, 89, 70, 86, 81), 85, 9),
  dawson: fighter("dawson", "Grant Dawson", "US", "united states", ["#9B1C31", "#F5EFE6", "#243B6B"], "22-2-1", 32, "5'10\"", "72\"", "Switch", "#15", profile(57, 69, 84, 74, 88, 72, 79, 74), 77, 6),
  rebecki: fighter("rebecki", "Mateusz Rebecki", "PL", "poland", ["#F5EFE6", "#DC143C", "#F5EFE6"], "20-2", 33, "5'7\"", "66\"", "Southpaw", "", profile(82, 54, 62, 65, 64, 44, 68, 67), 69, 5),
  miller: fighter("miller", "Jim Miller", "US", "united states", ["#9B1C31", "#F5EFE6", "#243B6B"], "37-18", 42, "5'8\"", "71\"", "Southpaw", "", profile(64, 60, 56, 61, 58, 82, 66, 84), 72, 2),
  gordon: fighter("gordon", "Jared Gordon", "US", "united states", ["#9B1C31", "#F5EFE6", "#243B6B"], "21-7", 37, "5'9\"", "68\"", "Orthodox", "", profile(75, 71, 52, 69, 55, 38, 78, 70), 68, 4),
  kopylov: fighter("kopylov", "Roman Kopylov", "RU", "russia", ["#F5EFE6", "#3456A4", "#B72B2D"], "14-3", 34, "6'0\"", "75\"", "Southpaw", "", profile(84, 62, 35, 64, 34, 28, 70, 66), 66, 5),
  tulio: fighter("tulio", "Marco Tulio", "BR", "brazil", ["#009B3A", "#FFDF00", "#002776"], "12-1", 31, "6'0\"", "74\"", "Orthodox", "", profile(78, 59, 52, 61, 50, 43, 69, 55), 57, 6),
  sabatini: fighter("sabatini", "Pat Sabatini", "US", "united states", ["#9B1C31", "#F5EFE6", "#243B6B"], "19-5", 35, "5'8\"", "70\"", "Orthodox", "", profile(53, 66, 82, 71, 84, 77, 72, 69), 71, 5),
  gomis: fighter("gomis", "William Gomis", "FR", "france", ["#0055A4", "#F5EFE6", "#EF4135"], "14-3", 28, "6'0\"", "73\"", "Southpaw", "", profile(73, 78, 45, 70, 42, 34, 75, 62), 63, 6),
  susurkaev: fighter("susurkaev", "Baysangur Susurkaev", "RU", "russia", ["#F5EFE6", "#3456A4", "#B72B2D"], "10-0", 24, "6'1\"", "74\"", "Orthodox", "", profile(80, 61, 68, 67, 70, 58, 72, 49), 53, 8),
  santos: fighter("santos", "Djorden Santos", "BR", "brazil", ["#009B3A", "#FFDF00", "#002776"], "9-1", 27, "6'0\"", "73\"", "Orthodox", "", profile(72, 64, 60, 65, 58, 55, 70, 47), 50, 4),
  carpenter: fighter("carpenter", "Clayton Carpenter", "US", "united states", ["#9B1C31", "#F5EFE6", "#243B6B"], "8-0", 29, "5'6\"", "66\"", "Orthodox", "", profile(71, 68, 76, 72, 78, 62, 74, 56), 61, 7),
  ochoa: fighter("ochoa", "Jose Ochoa", "PE", "peru", ["#D91023", "#F5EFE6", "#D91023"], "7-1", 25, "5'7\"", "67\"", "Switch", "", profile(77, 59, 54, 61, 53, 49, 69, 48), 52, 5)
};

const fight = (
  id: string,
  fighterAId: string,
  fighterBId: string,
  weightClass: string,
  rounds: 3 | 5,
  cardPlacement: Fight["cardPlacement"],
  styleClashLabel: string,
  matchupQuestion: string,
  fightShapeSummary: string
): Fight => ({
  id,
  fighterAId,
  fighterBId,
  weightClass,
  rounds,
  cardPlacement,
  styleClashLabel,
  matchupQuestion,
  fightShapeSummary,
  keyStatEdges: [
    { label: "striking volume", fighterA: fighters[fighterAId].styleProfile.strikingVolume, fighterB: fighters[fighterBId].styleProfile.strikingVolume },
    { label: "takedown threat", fighterA: fighters[fighterAId].styleProfile.wrestlingOffense, fighterB: fighters[fighterBId].styleProfile.wrestlingOffense },
    { label: "control threat", fighterA: fighters[fighterAId].styleProfile.controlThreat, fighterB: fighters[fighterBId].styleProfile.controlThreat },
    { label: "submission threat", fighterA: fighters[fighterAId].styleProfile.submissionThreat, fighterB: fighters[fighterBId].styleProfile.submissionThreat },
    { label: "cardio consistency", fighterA: fighters[fighterAId].styleProfile.cardioConsistency, fighterB: fighters[fighterBId].styleProfile.cardioConsistency },
    { label: "opponent quality", fighterA: fighters[fighterAId].styleProfile.opponentQuality, fighterB: fighters[fighterBId].styleProfile.opponentQuality }
  ],
  pathsToVictory: {
    fighterA: [
      { label: "first contact to control", weight: Math.min(96, fighters[fighterAId].styleProfile.controlThreat + 6) },
      { label: "repeat the strongest axis", weight: Math.min(92, fighters[fighterAId].styleProfile.wrestlingOffense + 4) },
      { label: "bank minutes between resets", weight: Math.min(86, fighters[fighterAId].styleProfile.cardioConsistency) }
    ],
    fighterB: [
      { label: "deny entries, keep feet active", weight: Math.min(96, fighters[fighterBId].styleProfile.takedownDefense + 5) },
      { label: "volume in quiet minutes", weight: Math.min(92, fighters[fighterBId].styleProfile.strikingVolume + 3) },
      { label: "repeatable late-round reads", weight: Math.min(86, fighters[fighterBId].styleProfile.cardioConsistency) }
    ]
  }
});

export const fights: Fight[] = [
  fight("chimaev-strickland", "chimaev", "strickland", "Middleweight title", 5, "Main Card", "control storm vs pressure jab", "Can Strickland keep the fight in repeatable boxing minutes before Chimaev compresses the space?", "Short fight or long fight. The shape is built around Chimaev's early control threat against Strickland's ability to turn minutes into volume."),
  fight("van-taira", "van", "taira", "Flyweight", 3, "Main Card", "volume boxer vs back-take chain", "Does Van's pace arrive before Taira can layer grappling threats?", "A speed fight with two different clocks: Van wins exchanges, Taira wins attachments."),
  fight("volkov-cortes", "volkov", "cortes", "Heavyweight", 3, "Main Card", "range tower vs pocket burst", "Can Cortes-Acosta close the long lane often enough?", "Volkov's shape is distance and attrition. Cortes-Acosta needs shorter rooms and cleaner exits."),
  fight("brady-buckley", "brady", "buckley", "Welterweight", 3, "Main Card", "chain wrestle vs power pace", "Can Buckley punish the entries before Brady stacks control?", "The fight tilts on first contact: Brady wants a grip, Buckley wants a collision."),
  fight("green-stephens", "green", "stephens", "Lightweight", 3, "Main Card", "touch volume vs single-shot damage", "Does Green's rhythm keep Stephens from loading up?", "Green's cleaner minute-winning style meets Stephens' narrower but heavier windows."),
  fight("gautier-diaz", "gautier", "diaz", "Middleweight", 3, "Prelims", "long southpaw pop vs durable counter", "Which fighter owns the outside lane?", "A developing striker test with range, patience, and reset discipline doing most of the work."),
  fight("alvarez-amosov", "alvarez", "amosov", "Lightweight", 3, "Prelims", "submission range vs pressure wrestling", "Can Alvarez create danger while Amosov is building control?", "Both fighters can win grappling minutes, but from opposite positions."),
  fight("dawson-rebecki", "dawson", "rebecki", "Lightweight", 3, "Prelims", "mat returns vs pocket pressure", "Can Rebecki keep exchanges upright long enough?", "Dawson wants repeatable control. Rebecki wants damage before the clinch settles."),
  fight("miller-gordon", "miller", "gordon", "Lightweight", 3, "Prelims", "veteran submission craft vs pressure minutes", "Does Miller find a chaos pocket before Gordon stacks volume?", "Miller's danger is sharp but intermittent. Gordon's edge is repeatability."),
  fight("kopylov-tulio", "kopylov", "tulio", "Middleweight", 3, "Early Prelims", "southpaw kickboxing vs pressure blend", "Can Tulio make Kopylov defend multiple layers?", "Kopylov owns the cleanest open-space weapons. Tulio needs blended pressure."),
  fight("sabatini-gomis", "sabatini", "gomis", "Featherweight", 3, "Early Prelims", "grappling squeeze vs long-range denial", "Can Gomis keep Sabatini off the hips?", "Sabatini's mat threat is the clearest axis. Gomis needs the fight stretched."),
  fight("susurkaev-santos", "susurkaev", "santos", "Middleweight", 3, "Early Prelims", "prospect pressure vs balanced counter", "Which prospect handles the first hard reset?", "A prospect read built around who keeps structure after the first failed layer."),
  fight("carpenter-ochoa", "carpenter", "ochoa", "Flyweight", 3, "Early Prelims", "scramble control vs switch-stance pop", "Can Ochoa keep the entries from becoming scrambles?", "Carpenter creates repeat positions. Ochoa needs movement to stay unpinned.")
];

export const event: Event = {
  id: "ufc-328",
  name: "UFC 328: Chimaev vs. Strickland",
  date: "May 9, 2026",
  location: "Newark, NJ",
  promotion: "UFC",
  fights
};

export function getFight(fightId: string) {
  return fights.find((item) => item.id === fightId);
}

export function getFighter(fighterId: string) {
  return fighters[fighterId];
}
