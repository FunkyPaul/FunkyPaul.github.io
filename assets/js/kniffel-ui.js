// Gemeinsame UI-Bausteine für Kniffel-Seiten (Würfelanzeige, Scoreboard).

const DIE_FACES_6 = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function dieLabel(die, value) {
  if (die.zeroBased) return String(value);
  if (die.sides === 6) return DIE_FACES_6[value] || String(value);
  return String(value);
}

function renderDice(container, config, values, heldMask, onToggle, disabled, justRolledMask) {
  container.innerHTML = "";
  config.dice.forEach((die, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "die" + (heldMask[i] ? " held" : "") + (die.sides !== 6 ? " die-d10" : "");
    btn.textContent = values[i] === null || values[i] === undefined ? "?" : dieLabel(die, values[i]);
    btn.disabled = disabled;
    btn.title = die.sides === 6 ? "6er-Würfel" : "10er-Würfel (0-9)";
    if (onToggle) btn.addEventListener("click", () => onToggle(i));
    container.appendChild(btn);
    if (justRolledMask && justRolledMask[i]) {
      // Klasse in einem zweiten Frame setzen, damit die Keyframe-Animation zuverlässig neu startet,
      // und danach wieder entfernen - sonst bleibt pointer-events:none dauerhaft aktiv.
      requestAnimationFrame(() => btn.classList.add("rolling"));
      const clearRolling = () => btn.classList.remove("rolling");
      btn.addEventListener("animationend", clearRolling, { once: true });
      setTimeout(clearRolling, 600);
    }
  });
}

function sectionLabel(section) {
  return section === "upper" ? "Oben" : "Unten";
}

function renderScorecard(container, variantId, players, activePlayerIndex, previewScores, onCellClick, justFilled) {
  const config = KNIFFEL_VARIANTS[variantId];
  container.innerHTML = "";

  const table = document.createElement("table");
  table.className = "score-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.innerHTML = "<th>Kategorie</th>" + players.map((p, i) =>
    `<th class="${i === activePlayerIndex ? "active-player" : ""}">${escapeHtml(p.name)}</th>`
  ).join("");
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let currentSection = null;

  for (const category of config.categories) {
    if (category.section !== currentSection) {
      currentSection = category.section;
      const sectionRow = document.createElement("tr");
      sectionRow.className = "section-row";
      sectionRow.innerHTML = `<td colspan="${players.length + 1}">${sectionLabel(currentSection)}</td>`;
      tbody.appendChild(sectionRow);
    }

    const row = document.createElement("tr");
    let cells = `<td>${escapeHtml(category.name)}</td>`;
    players.forEach((player, i) => {
      const filled = player.scores[category.id];
      const isActive = i === activePlayerIndex;
      if (filled !== null && filled !== undefined) {
        const isJustFilled = justFilled && justFilled.categoryId === category.id && justFilled.playerIndex === i;
        cells += `<td class="filled${isJustFilled ? " just-filled" : ""}">${filled}</td>`;
      } else if (isActive && previewScores && previewScores[category.id] !== undefined) {
        cells += `<td class="preview" data-category="${category.id}" data-player="${i}">${previewScores[category.id]}</td>`;
      } else {
        cells += `<td class="empty" data-category="${category.id}" data-player="${i}"></td>`;
      }
    });
    row.innerHTML = cells;
    tbody.appendChild(row);
  }

  // Zwischensummen
  players.forEach(() => {});
  const upperRow = document.createElement("tr");
  upperRow.className = "sum-row";
  upperRow.innerHTML = "<td>Summe oben</td>" + players.map((p) => `<td>${computeUpperSum(variantId, p.scores)}</td>`).join("");
  tbody.appendChild(upperRow);

  const bonusRow = document.createElement("tr");
  bonusRow.className = "sum-row";
  bonusRow.innerHTML = `<td>Bonus (ab ${config.upperBonusThreshold})</td>` + players.map((p) => {
    const t = computeTotal(variantId, p.scores, p.bonusKniffelCount);
    return `<td>${t.bonus}</td>`;
  }).join("");
  tbody.appendChild(bonusRow);

  if (config.extraKniffelBonus > 0) {
    const extraRow = document.createElement("tr");
    extraRow.className = "sum-row";
    extraRow.innerHTML = "<td>Zusatz-Kniffel</td>" + players.map((p) => `<td>${p.bonusKniffelCount * config.extraKniffelBonus}</td>`).join("");
    tbody.appendChild(extraRow);
  }

  const totalRow = document.createElement("tr");
  totalRow.className = "total-row";
  totalRow.innerHTML = "<td>Gesamt</td>" + players.map((p) => {
    const t = computeTotal(variantId, p.scores, p.bonusKniffelCount);
    return `<td>${t.total}</td>`;
  }).join("");
  tbody.appendChild(totalRow);

  table.appendChild(tbody);
  container.appendChild(table);

  if (onCellClick) {
    container.querySelectorAll("td.preview, td.empty").forEach((td) => {
      td.addEventListener("click", () => {
        const categoryId = td.dataset.category;
        const playerIndex = parseInt(td.dataset.player, 10);
        onCellClick(categoryId, playerIndex);
      });
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
