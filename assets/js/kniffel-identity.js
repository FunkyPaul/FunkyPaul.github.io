// Identität für Kniffel-Online-Partien: eingeloggte Appwrite-User ODER anonyme Gäste.
// Eingeloggte Spieler bekommen Wiedereinstieg nach Tab-Schließen/Reload und tauchen
// in der persönlichen Statistik auf. Gäste spielen wie bisher ohne Account.

function getGuestId() {
  let id = localStorage.getItem("kniffel_guest_id");
  if (!id) {
    id = "g_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("kniffel_guest_id", id);
  }
  return id;
}

// Liefert { userId, isLoggedIn, name } - name ist bei Login der Account-Name,
// sonst null (muss vom Nutzer eingegeben werden).
async function resolveIdentity() {
  const user = await getCurrentUser();
  if (user) {
    return { userId: user.$id, isLoggedIn: true, name: user.name };
  }
  return { userId: getGuestId(), isLoggedIn: false, name: null };
}

function kniffelLoginUrl(currentUrl) {
  return `/login/?redirect=${encodeURIComponent(currentUrl)}`;
}
