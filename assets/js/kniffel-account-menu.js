// Account-Menü oben rechts für alle Kniffel-Seiten: Login-Link oder
// Name + Dropdown (Logout, Passwort ändern). Erwartet ein Element mit
// id="account-menu" im Header sowie auth.js + appwrite-config.js vorher geladen.

async function renderAccountMenu() {
  const container = document.getElementById("account-menu");
  if (!container) return;

  const user = await getCurrentUser();
  const returnUrl = window.location.href;

  if (!user) {
    container.innerHTML = `<a href="/login/?redirect=${encodeURIComponent(returnUrl)}"><button class="secondary">Einloggen</button></a>`;
    return;
  }

  container.innerHTML = `
    <div class="account-menu">
      <button type="button" class="secondary account-menu-trigger" id="account-menu-trigger">${escapeHtmlAccount(user.name)} ▾</button>
      <div class="account-menu-dropdown hidden" id="account-menu-dropdown">
        <button type="button" id="account-menu-password">Passwort ändern</button>
        <button type="button" class="danger" id="account-menu-logout">Ausloggen</button>
      </div>
    </div>
  `;

  const trigger = document.getElementById("account-menu-trigger");
  const dropdown = document.getElementById("account-menu-dropdown");

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });
  document.addEventListener("click", () => dropdown.classList.add("hidden"));
  dropdown.addEventListener("click", (e) => e.stopPropagation());

  document.getElementById("account-menu-logout").addEventListener("click", logout);
  document.getElementById("account-menu-password").addEventListener("click", () => {
    dropdown.classList.add("hidden");
    openPasswordDialog();
  });
}

function escapeHtmlAccount(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function openPasswordDialog() {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="overlay-card card">
      <button type="button" class="secondary overlay-close" id="pw-dialog-close">✕</button>
      <h3 style="margin-top:0">Passwort ändern</h3>
      <form id="pw-dialog-form">
        <label for="pw-current">Aktuelles Passwort</label>
        <input type="password" id="pw-current" required autocomplete="current-password" />
        <label for="pw-new">Neues Passwort</label>
        <input type="password" id="pw-new" required minlength="8" autocomplete="new-password" />
        <div class="btn-row">
          <button type="submit">Speichern</button>
        </div>
        <div class="error-msg" id="pw-dialog-error"></div>
        <div class="roll-count hidden" id="pw-dialog-success">Passwort wurde geändert.</div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById("pw-dialog-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.getElementById("pw-dialog-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("pw-dialog-error");
    const successEl = document.getElementById("pw-dialog-success");
    errorEl.textContent = "";
    successEl.classList.add("hidden");

    const current = document.getElementById("pw-current").value;
    const next = document.getElementById("pw-new").value;

    try {
      await changePassword(next, current);
      successEl.classList.remove("hidden");
      document.getElementById("pw-dialog-form").reset();
      setTimeout(close, 1200);
    } catch (err) {
      errorEl.textContent = err.message || "Passwort konnte nicht geändert werden.";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof getCurrentUser === "function") renderAccountMenu();
});
