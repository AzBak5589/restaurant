#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

echo "== DB Doctor =="

if [ ! -f "$ENV_FILE" ]; then
  echo "ERREUR: fichier .env introuvable dans $ROOT_DIR"
  exit 1
fi

DB_URL="$(node -e '
const fs = require("fs");
const path = process.argv[1];
const content = fs.readFileSync(path, "utf8");
const line = content.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
if (!line) process.exit(2);
const value = line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
process.stdout.write(value);
' "$ENV_FILE" 2>/dev/null)"

if [ -z "${DB_URL:-}" ]; then
  echo "ERREUR: DATABASE_URL absente dans .env"
  exit 1
fi

DB_INFO="$(node -e '
const url = process.argv[1];
try {
  const u = new URL(url);
  const dbName = (u.pathname || "").replace(/^\//, "") || "(inconnu)";
  const host = u.hostname || "localhost";
  const port = u.port || "5432";
  const user = decodeURIComponent(u.username || "");
  const password = decodeURIComponent(u.password || "");
  process.stdout.write(JSON.stringify({ host, port, dbName, user, password }));
} catch {
  process.exit(2);
}
' "$DB_URL" 2>/dev/null)"

if [ -z "${DB_INFO:-}" ]; then
  echo "ERREUR: DATABASE_URL invalide"
  exit 1
fi

DB_HOST="$(node -e 'const x = JSON.parse(process.argv[1]); process.stdout.write(x.host);' "$DB_INFO")"
DB_PORT="$(node -e 'const x = JSON.parse(process.argv[1]); process.stdout.write(x.port);' "$DB_INFO")"
DB_NAME="$(node -e 'const x = JSON.parse(process.argv[1]); process.stdout.write(x.dbName);' "$DB_INFO")"
DB_USER="$(node -e 'const x = JSON.parse(process.argv[1]); process.stdout.write(x.user);' "$DB_INFO")"
DB_PASSWORD="$(node -e 'const x = JSON.parse(process.argv[1]); process.stdout.write(x.password || "");' "$DB_INFO")"

echo "DATABASE_URL -> host=$DB_HOST port=$DB_PORT db=$DB_NAME user=$DB_USER"

echo
echo "[1/3] Processus a l'ecoute sur le port $DB_PORT"
if lsof -nP -iTCP:"$DB_PORT" -sTCP:LISTEN; then
  :
else
  echo "Aucun service PostgreSQL n'ecoute sur le port $DB_PORT"
fi

PSQL_BIN=""
for candidate in \
  "/opt/homebrew/opt/postgresql@16/bin/psql" \
  "/opt/homebrew/opt/libpq/bin/psql" \
  "/Library/PostgreSQL/16/bin/psql" \
  "psql"
do
  if command -v "$candidate" >/dev/null 2>&1; then
    PSQL_BIN="$(command -v "$candidate")"
    break
  fi
done

echo
echo "[2/3] Binaire psql"
if [ -n "$PSQL_BIN" ]; then
  echo "psql trouve: $PSQL_BIN"
else
  echo "ERREUR: psql introuvable dans le PATH."
  echo "Installe/active psql puis relance: npm run db:doctor"
  exit 1
fi

echo
echo "[3/3] Test connexion + contexte serveur"
if PGPASSWORD="$DB_PASSWORD" "$PSQL_BIN" \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -P pager=off \
  -c "SELECT current_user, current_database(), inet_server_port() AS port, current_setting('data_directory') AS data_directory;" \
  >/tmp/db_doctor_output.txt 2>/tmp/db_doctor_error.txt; then
  cat /tmp/db_doctor_output.txt
  echo
  echo "OK: connexion PostgreSQL valide."
  exit 0
fi

echo "ECHEC: connexion PostgreSQL impossible."
cat /tmp/db_doctor_error.txt
echo
echo "Pistes de correction:"
echo "- Verifier user/password dans DATABASE_URL"
echo "- Verifier qu'une seule instance PostgreSQL ecoute sur le port cible"
echo "- Verifier les permissions de /tmp (doit etre 1777) si lock socket impossible"
exit 1
