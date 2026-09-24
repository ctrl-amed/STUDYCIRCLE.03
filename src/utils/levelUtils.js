export const LEVEL_MATRIX = [
  { level: 1, title: "Sprout Initiate", cumulativeXP: 0 },
  { level: 5, title: "Tiny Seedling", cumulativeXP: 1701 },
  { level: 10, title: "Budding Blossom", cumulativeXP: 11102 },
  { level: 15, title: "Focused Scholar", cumulativeXP: 31993 },
  { level: 20, title: "Cozy Sage", cumulativeXP: 67128 },
  { level: 25, title: "Master of Flow", cumulativeXP: 118800 },
  { level: 30, title: "Arch-Scholar", cumulativeXP: 189018 },
  { level: 40, title: "Sequoia Guardian", cumulativeXP: 392183 },
  { level: 50, title: "Golden Sequoia", cumulativeXP: 689494 },
];

export function getNextLevelRequirement(currentLevel) {
  return Math.floor(100 * Math.pow(currentLevel, 1.5));
}

export function calculateLevelFromXP(totalXP) {
  let matchedLevel = 1;
  let cumulative = 0;
  for (let l = 1; l <= 50; l++) {
    const cost = Math.floor(100 * Math.pow(l, 1.5));
    if (totalXP >= cumulative) {
      matchedLevel = l;
    }
    cumulative += cost;
  }
  return matchedLevel;
}

export function getPlayerTitle(level) {
  let currentTitle = "Sprout Initiate";
  const milestones = [
    { lvl: 50, title: "Golden Sequoia" }, { lvl: 40, title: "Sequoia Guardian" },
    { lvl: 30, title: "Arch-Scholar" }, { lvl: 25, title: "Master of Flow" },
    { lvl: 20, title: "Cozy Sage" }, { lvl: 15, title: "Focused Scholar" },
    { lvl: 10, title: "Budding Blossom" }, { lvl: 5, title: "Tiny Seedling" },
    { lvl: 1, title: "Sprout Initiate" },
  ];
  for (const m of milestones) {
    if (level >= m.lvl) { currentTitle = m.title; break; }
  }
  return currentTitle;
}