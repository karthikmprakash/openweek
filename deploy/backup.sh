#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="${1:-$root/backups/openweek-$stamp.db}"

mkdir -p "$(dirname "$out")"

docker compose -f "$root/compose.yaml" exec -T app node -e "
const Database = require('better-sqlite3');
const dest = '/backups/$(basename "$out")';
const db = new Database(process.env.OPENWEEK_DB);
db.backup(dest).then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
"

if [ ! -f "$out" ]; then
  echo "Backup did not appear at $out" >&2
  exit 1
fi

echo "$out"
