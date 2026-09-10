// Zentrale Appwrite-Konfiguration für alle Projekte auf dieser Seite.
// Diese Werte sind öffentlich (Client-seitig) und kein Geheimnis -
// die eigentliche Sicherheit kommt aus den Permissions in Appwrite.

const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6aa2dd1400121fabd50a";

const client = new Appwrite.Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const account = new Appwrite.Account(client);
const tablesDB = new Appwrite.TablesDB(client);
