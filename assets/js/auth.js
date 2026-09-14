// Gemeinsame Auth-Logik, die von jeder Projekt-Seite genutzt werden kann.

// account.get() ist ein Netzwerk-Roundtrip zu Appwrite. Mehrere Stellen auf
// derselben Seite (Account-Menü, Identität, Seiten-eigene Login-Prüfung) fragen
// den Nutzer unabhängig voneinander ab - das gecachte Promise sorgt dafür, dass
// pro Seitenaufruf nur eine Anfrage rausgeht, egal wie oft getCurrentUser() aufgerufen wird.
let _currentUserPromise = null;

async function getCurrentUser() {
  if (!_currentUserPromise) {
    _currentUserPromise = account.get().catch(() => null);
  }
  return _currentUserPromise;
}

// Nach Login/Logout/Registrierung muss der Cache verworfen werden, sonst zeigt
// die Seite weiter den alten (oder keinen) Nutzer an.
function invalidateCurrentUserCache() {
  _currentUserPromise = null;
}

async function requireLogin(redirectTo = "/login/") {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

async function login(email, password) {
  await account.createEmailPasswordSession(email, password);
  invalidateCurrentUserCache();
}

async function register(name, email, password) {
  await account.create(Appwrite.ID.unique(), email, password, name);
  await login(email, password);
}

async function logout() {
  await account.deleteSession("current");
  invalidateCurrentUserCache();
  window.location.href = "/login/";
}

async function changePassword(newPassword, oldPassword) {
  await account.updatePassword(newPassword, oldPassword);
}
