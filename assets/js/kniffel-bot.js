// Kniffel-Bot-KI: trifft Halte- und Eintrage-Entscheidungen für Computerspieler.
// Zwei Schwierigkeitsgrade:
//  - "profi": wählt bei jedem Schritt statistisch die beste Option (Monte-Carlo-
//    geschätzter Erwartungswert über alle Halte-Kombinationen, sowie eine
//    Bewertung, die auch den Wert offener Kategorien für spätere Würfe einbezieht).
//  - "intermediate": nutzt dieselbe Bewertung, wählt aber mit einer gewissen
//    Wahrscheinlichkeit bewusst eine schwächere (aber nicht katastrophale) Option.

const BOT_DIFFICULTIES = {
  profi: { label: "Profi", mistakeChance: 0, samples: 60 },
  intermediate: { label: "Intermediate", mistakeChance: 0.22, samples: 25 },
};

// Punktwert, den eine Kategorie im Mittel bringt, wenn man frei würfeln könnte -
// dient als Näherung dafür, "wie schade" es ist, ein Feld jetzt suboptimal zu
// verbrauchen bzw. wie sehr es sich lohnt, ein Feld für später offenzuhalten.
const _categoryAverageCache = {};

function estimateCategoryAverageValue(variantId, categoryId) {
  const cacheKey = variantId + ":" + categoryId;
  if (_categoryAverageCache[cacheKey] !== undefined) return _categoryAverageCache[cacheKey];

  const config = KNIFFEL_VARIANTS[variantId];
  const samples = 400;
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const values = config.dice.map((die) => rollDie(die));
    total += scoreCategory(variantId, categoryId, values);
  }
  const avg = total / samples;
  _categoryAverageCache[cacheKey] = avg;
  return avg;
}

// Bewertet einen fertigen Wurf für eine bestimmte offene Kategorie: der Sofort-Score,
// abzüglich eines kleinen Abschlags dafür, dass "gute" Kategorien (hoher Mittelwert)
// wertvoller sind, um sie für einen passenderen Wurf aufzuheben.
function scoreCategoryChoice(variantId, categoryId, values, isJokerFill) {
  const immediate = isJokerFill ? maxCategoryValue(variantId, categoryId) : scoreCategory(variantId, categoryId, values);
  const avgValue = estimateCategoryAverageValue(variantId, categoryId);
  // Kategorien, die man mit diesem Wurf weit über ihrem Mittelwert trifft, sind
  // "gute Gelegenheiten" - das wird leicht bevorzugt gegenüber dem reinen Sofortwert,
  // damit z.B. eine Chance nicht für einen mittelmäßigen Wurf verbrannt wird,
  // während ein spezialisiertes Feld noch offen und ungenutzt bliebe.
  return immediate - avgValue * 0.15;
}

// Wählt aus den offenen Kategorien die beste Eintragung für den aktuellen Wurf.
function chooseBotCategory(variantId, values, player, difficulty) {
  const config = KNIFFEL_VARIANTS[variantId];
  const openCategories = config.categories.filter((c) => player.scores[c.id] === null);

  const isJoker = config.extraKniffelBonus > 0 && isKniffelRoll(variantId, values) && player.scores.kniffel === 50;

  const options = openCategories.map((category) => {
    const isJokerFill = isJoker && category.id !== "kniffel";
    const value = scoreCategoryChoice(variantId, category.id, values, isJokerFill);
    const immediate = isJokerFill ? maxCategoryValue(variantId, category.id) : scoreCategory(variantId, category.id, values);
    return { categoryId: category.id, value, immediate, isJokerFill };
  });

  options.sort((a, b) => b.value - a.value);

  const chosen = pickWithMistakeChance(options, difficulty);
  return chosen;
}

// Wählt aus einer nach Qualität absteigend sortierten Optionsliste eine aus -
// bei "Fehlerwahrscheinlichkeit" manchmal eine der mittleren statt die beste.
function pickWithMistakeChance(sortedOptions, difficulty) {
  const settings = BOT_DIFFICULTIES[difficulty] || BOT_DIFFICULTIES.profi;
  if (sortedOptions.length <= 1 || Math.random() >= settings.mistakeChance) {
    return sortedOptions[0];
  }
  // Ein "Fehler" bleibt moderat: wähle zufällig aus der oberen Hälfte (ohne die
  // beste Option), statt komplett willkürlich zu spielen.
  const poolSize = Math.max(1, Math.ceil(sortedOptions.length / 2));
  const pickIndex = 1 + Math.floor(Math.random() * Math.min(poolSize, sortedOptions.length - 1));
  return sortedOptions[pickIndex];
}

// Schätzt per Monte-Carlo-Simulation den Erwartungswert einer Halte-Maske: würfelt
// die nicht gehaltenen Würfel mehrfach neu und bewertet die beste erreichbare
// Kategorie-Entscheidung für dieses Ergebnis. Bei noch folgenden Würfen zählt nicht
// der Sofortwert, sondern der beste erzielbare Wert über alle offenen Kategorien
// (unabhängig davon, ob man das Feld sofort ausfüllen würde) - das drückt aus, wie
// gut diese Zwischenposition für den nächsten Wurf ist, ohne die Kosten einer
// vollen rekursiven Simulation weiterer Würfe zu haben.
function estimateHoldValue(variantId, heldMask, currentValues, player, rollsRemaining, samples) {
  const config = KNIFFEL_VARIANTS[variantId];
  let total = 0;

  for (let i = 0; i < samples; i++) {
    const values = config.dice.map((die, idx) => (heldMask[idx] ? currentValues[idx] : rollDie(die)));
    const best = chooseBotCategory(variantId, values, player, "profi");
    total += best ? best.value : 0;
  }

  return total / samples;
}

// Bestimmt die beste Halte-Maske für den aktuellen Wurf (Monte-Carlo über alle
// 2^n Kombinationen). rollsRemaining zählt die nach diesem Zug noch folgenden Würfe.
function chooseBotHoldMask(variantId, currentValues, player, rollsRemaining, samples) {
  const config = KNIFFEL_VARIANTS[variantId];
  const diceCount = config.dice.length;
  const combinations = 1 << diceCount;

  let bestMask = null;
  let bestValue = -Infinity;
  const results = [];

  for (let mask = 0; mask < combinations; mask++) {
    const heldMask = [];
    for (let i = 0; i < diceCount; i++) heldMask.push(!!(mask & (1 << i)));

    const value = estimateHoldValue(variantId, heldMask, currentValues, player, rollsRemaining, samples);
    results.push({ mask: heldMask, value });
    if (value > bestValue) {
      bestValue = value;
      bestMask = heldMask;
    }
  }

  results.sort((a, b) => b.value - a.value);
  return { mask: bestMask, value: bestValue, all: results };
}

// Öffentliche Entscheidungsfunktion für einen Zug: gibt zurück, welche Würfel
// gehalten werden sollen (heldMask) - wird vor jedem Neuwürfeln aufgerufen.
function decideBotHold(variantId, currentValues, player, rollsRemaining) {
  const settings = BOT_DIFFICULTIES[player.botDifficulty] || BOT_DIFFICULTIES.profi;
  const result = chooseBotHoldMask(variantId, currentValues, player, rollsRemaining, settings.samples);
  const chosen = pickWithMistakeChance(result.all, player.botDifficulty);
  return chosen.mask;
}

// Öffentliche Entscheidungsfunktion für die Kategorie-Wahl nach dem letzten Wurf.
function decideBotCategory(variantId, values, player) {
  return chooseBotCategory(variantId, values, player, player.botDifficulty);
}

// Entscheidet, ob ein Bot (bei Kniffel Extreme) einen Chip für einen vierten Wurf
// einsetzt: lohnt sich, wenn der aktuell beste Kategorie-Wert spürbar unter dem
// Durchschnitt der besten offenen Kategorie liegt und noch Chips übrig sind.
function decideBotUseChip(variantId, values, player) {
  if (!player.chips || player.chips <= 0) return false;
  const settings = BOT_DIFFICULTIES[player.botDifficulty] || BOT_DIFFICULTIES.profi;
  if (Math.random() < settings.mistakeChance * 0.5) return false;

  const best = chooseBotCategory(variantId, values, player, "profi");
  if (!best) return false;

  const config = KNIFFEL_VARIANTS[variantId];
  const openCategories = config.categories.filter((c) => player.scores[c.id] === null);
  const bestPossible = Math.max(...openCategories.map((c) => estimateCategoryAverageValue(variantId, c.id) * 1.3));

  // Chip einsetzen, wenn der aktuelle Wurf deutlich schlechter ist als das, was im
  // Feld realistisch drin wäre - andernfalls Punkte lieber sichern.
  return best.immediate < bestPossible * 0.6;
}
