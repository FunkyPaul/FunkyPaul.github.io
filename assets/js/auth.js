// Gemeinsame Auth-Logik, die von jeder Projekt-Seite genutzt werden kann.

async function getCurrentUser() {
  try {
    return await account.get();
  } catch (err) {
    return null;
  }
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
}

async function register(name, email, password) {
  await account.create(Appwrite.ID.unique(), email, password, name);
  await login(email, password);
}

async function logout() {
  await account.deleteSession("current");
  window.location.href = "/login/";
}
