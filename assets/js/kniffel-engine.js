// Gemeinsame Spiellogik für Kniffel und Kniffel Extreme.
// Regeln entnommen aus den offiziellen Schmidt-Spiele-Anleitungen.

const KNIFFEL_VARIANTS = {
  kniffel: {
    id: "kniffel",
    name: "Kniffel",
    dice: [{ sides: 6 }, { sides: 6 }, { sides: 6 }, { sides: 6 }, { sides: 6 }],
    maxRolls: 3,
    upperBonusThreshold: 63,
    upperBonusPoints: 35,
    useChips: false,
    categories: [
      { id: "ones", name: "Einsen", section: "upper", face: 1 },
      { id: "twos", name: "Zweien", section: "upper", face: 2 },
      { id: "threes", name: "Dreien", section: "upper", face: 3 },
      { id: "fours", name: "Vieren", section: "upper", face: 4 },
      { id: "fives", name: "Fünfen", section: "upper", face: 5 },
      { id: "sixes", name: "Sechsen", section: "upper", face: 6 },
      { id: "threeOfKind", name: "Dreierpasch", section: "lower", scorer: "nOfKindSum", minCount: 3 },
      { id: "fourOfKind", name: "Viererpasch", section: "lower", scorer: "nOfKindSum", minCount: 4 },
      { id: "fullHouse", name: "Full House", section: "lower", scorer: "fullHouse", groupA: 3, groupB: 2, flat: 25 },
      { id: "smallStraight", name: "Kleine Straße", section: "lower", scorer: "straight", length: 4, flat: 30 },
      { id: "largeStraight", name: "Große Straße", section: "lower", scorer: "straight", length: 5, flat: 40 },
      { id: "kniffel", name: "Kniffel", section: "lower", scorer: "kniffel", count: 5, flat: 50 },
      { id: "chance", name: "Chance", section: "lower", scorer: "sumAll" },
    ],
    // Standardregel: jeder weitere Kniffel gibt 50 Bonuspunkte + Joker in ein
    // passendes offenes Kästchen (oder falls keins offen ist, in ein beliebiges).
    extraKniffelBonus: 50,
  },

  kniffel_extreme: {
    id: "kniffel_extreme",
    name: "Kniffel Extreme",
    dice: [{ sides: 6 }, { sides: 6 }, { sides: 6 }, { sides: 6 }, { sides: 6 }, { sides: 10, zeroBased: true }],
    maxRolls: 3,
    extraRollWithChip: true,
    startingChips: 3,
    upperBonusThreshold: 73,
    upperBonusPoints: 45,
    useChips: true,
    categories: [
      { id: "ones", name: "Einsen", section: "upper", face: 1 },
      { id: "twos", name: "Zweien", section: "upper", face: 2 },
      { id: "threes", name: "Dreien", section: "upper", face: 3 },
      { id: "fours", name: "Vieren", section: "upper", face: 4 },
      { id: "fives", name: "Fünfen", section: "upper", face: 5 },
      { id: "sixes", name: "Sechsen", section: "upper", face: 6 },
      { id: "threeOfKind", name: "Dreierpasch", section: "lower", scorer: "nOfKindSum", minCount: 3 },
      { id: "fourOfKind", name: "Viererpasch", section: "lower", scorer: "nOfKindSum", minCount: 4 },
      { id: "twoPairs", name: "Zwei Paare", section: "lower", scorer: "nPairsSum", pairs: 2 },
      { id: "threePairs", name: "Drei Paare", section: "lower", scorer: "nPairsFlat", pairs: 3, flat: 35 },
      { id: "fullHouse", name: "Full-House", section: "lower", scorer: "fullHouse", groupA: 3, groupB: 2, flat: 25 },
      { id: "bigFullHouse", name: "Großes Full House", section: "lower", scorer: "fullHouse", groupA: 4, groupB: 2, flat: 45 },
      { id: "smallStraight", name: "Kleine Straße", section: "lower", scorer: "straight", length: 4, flat: 30 },
      { id: "largeStraight", name: "Große Straße", section: "lower", scorer: "straight", length: 5, flat: 40 },
      { id: "highway", name: "Highway", section: "lower", scorer: "straight", length: 6, flat: 50 },
      { id: "kniffel", name: "Kniffel", section: "lower", scorer: "kniffel", count: 5, flat: 50 },
      { id: "kniffelExtreme", name: "Kniffel Extreme", section: "lower", scorer: "kniffel", count: 6, flat: 75 },
      { id: "tenOrLess", name: "10 oder weniger", section: "lower", scorer: "sumAtMost", max: 10, flat: 40 },
      { id: "thirtyThreeOrMore", name: "33 oder mehr", section: "lower", scorer: "sumAtLeast", min: 33, flat: 40 },
      { id: "chance", name: "Chance", section: "lower", scorer: "sumAll" },
      { id: "superChance", name: "Super Chance", section: "lower", scorer: "sumAllDoubled" },
    ],
    // Laut Anleitung gibt es in Kniffel Extreme keine Zusatzpunkte für einen
    // zweiten Kniffel oder Kniffel Extreme.
    extraKniffelBonus: 0,
  },
};

function rollDie(die) {
  const sides = die.sides;
  if (die.zeroBased) {
    return Math.floor(Math.random() * sides); // 0..9
  }
  return 1 + Math.floor(Math.random() * sides); // 1..sides
}

function rollDice(variant, keepMask, previousValues) {
  const config = KNIFFEL_VARIANTS[variant];
  const values = config.dice.map((die, i) => {
    if (keepMask && keepMask[i] && previousValues) return previousValues[i];
    return rollDie(die);
  });
  return values;
}

function countFaces(values) {
  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  return counts;
}

function sumAll(values) {
  return values.reduce((a, b) => a + b, 0);
}

// -- Scorers: each returns the point value for a given category+dice, or 0 if not met. --

function scoreUpper(category, values) {
  return values.filter((v) => v === category.face).length * category.face;
}

function scoreNOfKindSum(category, values) {
  const counts = countFaces(values);
  const hasIt = Object.values(counts).some((c) => c >= category.minCount);
  return hasIt ? sumAll(values) : 0;
}

function scoreNPairsSum(category, values) {
  const counts = countFaces(values);
  const pairFaces = Object.keys(counts).filter((f) => counts[f] >= 2);
  if (pairFaces.length < category.pairs) return 0;
  // Nimm die (nach Augenwert) höchsten Paare, summiere alle beteiligten Würfel.
  const sorted = pairFaces.map(Number).sort((a, b) => b - a).slice(0, category.pairs);
  return sorted.reduce((sum, face) => sum + face * 2, 0);
}

function scoreNPairsFlat(category, values) {
  const counts = countFaces(values);
  const pairFaces = Object.keys(counts).filter((f) => counts[f] >= 2);
  return pairFaces.length >= category.pairs ? category.flat : 0;
}

function scoreFullHouse(category, values) {
  const counts = Object.values(countFaces(values)).sort((a, b) => b - a);
  const hasGroupA = counts.some((c) => c >= category.groupA);
  if (!hasGroupA) return 0;
  // Nach Entnahme der größten Gruppe muss noch eine zweite Gruppe übrig bleiben.
  const remaining = [...counts];
  remaining.splice(remaining.indexOf(Math.max(...remaining)), 1);
  const hasGroupB = remaining.some((c) => c >= category.groupB) || counts.filter((c) => c >= category.groupA).length >= 2;
  return hasGroupB ? category.flat : 0;
}

function scoreStraight(category, values) {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  for (let i = 0; i + category.length <= unique.length; i++) {
    let consecutive = true;
    for (let j = 1; j < category.length; j++) {
      if (unique[i + j] !== unique[i] + j) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) return category.flat;
  }
  return 0;
}

function scoreKniffel(category, values) {
  const counts = countFaces(values);
  const hasIt = Object.values(counts).some((c) => c >= category.count);
  return hasIt ? category.flat : 0;
}

function scoreSumAtMost(category, values) {
  const total = sumAll(values);
  return total <= category.max ? category.flat : 0;
}

function scoreSumAtLeast(category, values) {
  const total = sumAll(values);
  return total >= category.min ? category.flat : 0;
}

const SCORERS = {
  nOfKindSum: scoreNOfKindSum,
  nPairsSum: scoreNPairsSum,
  nPairsFlat: scoreNPairsFlat,
  fullHouse: scoreFullHouse,
  straight: scoreStraight,
  kniffel: scoreKniffel,
  sumAll: (_, values) => sumAll(values),
  sumAllDoubled: (_, values) => sumAll(values) * 2,
  sumAtMost: scoreSumAtMost,
  sumAtLeast: scoreSumAtLeast,
};

function scoreCategory(variantId, categoryId, values) {
  const config = KNIFFEL_VARIANTS[variantId];
  const category = config.categories.find((c) => c.id === categoryId);
  if (!category) return 0;
  if (category.section === "upper") return scoreUpper(category, values);
  const scorer = SCORERS[category.scorer];
  return scorer ? scorer(category, values) : 0;
}

// Höchstpunktzahl einer Kategorie - für den Zusatz-Kniffel-Joker, bei dem ein
// beliebiges offenes Kästchen unabhängig vom Würfelergebnis maximal gefüllt wird.
function maxCategoryValue(variantId, categoryId) {
  const config = KNIFFEL_VARIANTS[variantId];
  const category = config.categories.find((c) => c.id === categoryId);
  if (!category) return 0;
  if (category.section === "upper") return category.face * config.dice.length;
  switch (category.scorer) {
    case "sumAll":
      return config.dice.reduce((sum, die) => sum + (die.zeroBased ? die.sides - 1 : die.sides), 0);
    case "sumAllDoubled":
      return config.dice.reduce((sum, die) => sum + (die.zeroBased ? die.sides - 1 : die.sides), 0) * 2;
    case "nOfKindSum":
    case "nPairsSum":
      return config.dice.reduce((sum, die) => sum + (die.zeroBased ? die.sides - 1 : die.sides), 0);
    default:
      return category.flat || 0;
  }
}

function isKniffelRoll(variantId, values) {
  const config = KNIFFEL_VARIANTS[variantId];
  const counts = countFaces(values);
  const target = config.dice.length;
  return Object.values(counts).some((c) => c === target);
}

// Berechnet für alle offenen Kategorien den erzielbaren Punktwert (für die UI-Vorschau).
function computeAllScores(variantId, values, filledCategoryIds) {
  const config = KNIFFEL_VARIANTS[variantId];
  const result = {};
  for (const category of config.categories) {
    if (filledCategoryIds.includes(category.id)) continue;
    result[category.id] = scoreCategory(variantId, category.id, values);
  }
  return result;
}

function computeUpperSum(variantId, scores) {
  const config = KNIFFEL_VARIANTS[variantId];
  const upperIds = config.categories.filter((c) => c.section === "upper").map((c) => c.id);
  return upperIds.reduce((sum, id) => sum + (scores[id] || 0), 0);
}

function computeTotal(variantId, scores, bonusKniffelCount) {
  const config = KNIFFEL_VARIANTS[variantId];
  const upperSum = computeUpperSum(variantId, scores);
  const bonus = upperSum >= config.upperBonusThreshold ? config.upperBonusPoints : 0;
  const lowerIds = config.categories.filter((c) => c.section === "lower").map((c) => c.id);
  const lowerSum = lowerIds.reduce((sum, id) => sum + (scores[id] || 0), 0);
  const extraKniffelPoints = (bonusKniffelCount || 0) * config.extraKniffelBonus;
  return {
    upperSum,
    bonus,
    lowerSum,
    extraKniffelPoints,
    total: upperSum + bonus + lowerSum + extraKniffelPoints,
  };
}

function createEmptyPlayerScore(variantId) {
  const config = KNIFFEL_VARIANTS[variantId];
  const scores = {};
  for (const category of config.categories) scores[category.id] = null;
  return { scores, bonusKniffelCount: 0, chips: config.startingChips || 0 };
}

function isGameFinished(variantId, players) {
  const config = KNIFFEL_VARIANTS[variantId];
  return players.every((p) => config.categories.every((c) => p.scores[c.id] !== null));
}
