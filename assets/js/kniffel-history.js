// Gemeinsames Schreiben von Verlaufseinträgen (game_history) für lokale und Online-Partien.
// Voraussetzung: appwrite-config.js (tablesDB) und kniffel-engine.js sind bereits geladen.

const HISTORY_DATABASE_ID = "main";
const HISTORY_TABLE_ID = "game_history";

// players: Array von { name, userId (oder null), scores, bonusKniffelCount }
async function writeKniffelHistory(variantId, players, status) {
  const historyPlayers = players.map((p) => {
    const totals = computeTotal(variantId, p.scores, p.bonusKniffelCount);
    return { name: p.name, userId: p.userId || null, total: totals.total, scores: p.scores };
  });
  const maxTotal = Math.max(...historyPlayers.map((p) => p.total));
  const winners = historyPlayers.filter((p) => p.total === maxTotal).map((p) => p.name);
  const participantUserIds = players.filter((p) => p.userId).map((p) => p.userId);

  // Ohne mindestens eine eingeloggte Person gibt es niemanden, der die Partie im
  // eigenen Verlauf wiederfinden könnte - dann lohnt sich der Schreibvorgang nicht.
  if (participantUserIds.length === 0) return;

  try {
    await tablesDB.createRow({
      databaseId: HISTORY_DATABASE_ID,
      tableId: HISTORY_TABLE_ID,
      rowId: Appwrite.ID.unique(),
      data: {
        variant: variantId,
        status,
        players: JSON.stringify(historyPlayers),
        participantUserIds,
        endedAt: new Date().toISOString(),
        winnerName: status === "finished" ? winners.join(", ") : null,
      },
    });
  } catch (err) {
    // Verlaufseintrag ist ein Zusatz - ein Fehler hier soll das laufende Spiel nicht blockieren.
  }
}
