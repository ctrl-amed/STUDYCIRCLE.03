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

// Pormula mula sa Level Progression Spec: 100 * (Level ^ 1.5)[cite: 2]
export function getNextLevelRequirement(currentLevel) {
  return Math.floor(100 * Math.pow(currentLevel, 1.5));
}

export function calculateLevelFromXP(totalXP) {
  let matchedLevel = 1;
  for (const item of LEVEL_MATRIX) {
    if (totalXP >= item.cumulativeXP) {
      matchedLevel = item.level;
    }
  }
  return matchedLevel;
}

export function getPlayerTitle(level) {
  let currentTitle = "Sprout Initiate";
  for (const item of LEVEL_MATRIX) {
    if (level >= item.level) {
      currentTitle = item.title;
    }
  }
  return currentTitle;
}