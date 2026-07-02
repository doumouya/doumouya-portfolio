#!/bin/bash
# seed-birama.sh — register the Cleaner's metadata types on a birama-engine API
# (the everything-is-data move: three POST /api/types, no migration, hot-reload)
# and seed the demo project + file. Idempotent-ish: re-runs report conflicts and
# keep going. Needs a DEBUG api build (dev-login is compiled out of release).
#
#   BIRAMA_URL=http://127.0.0.1:8098 sh tools/seed-birama.sh
set -uo pipefail
BIRAMA="${BIRAMA_URL:-http://127.0.0.1:8098}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

say() { printf '\n== %s\n' "$*"; }
post() { # path json
  curl -sS -b "$JAR" -c "$JAR" -X POST "$BIRAMA$1" \
    -H 'content-type: application/json' -d "$2" -w '\n   -> %{http_code}\n'
}

say "auth (debug dev-login)"
post /auth/dev-login '{}'

say "type: cleaner_project (CLP)"
post /api/types '{
  "type_id": "cleaner_project", "id_prefix": "CLP",
  "display_name": "Cleaner project", "display_name_plural": "Cleaner projects",
  "scope_parents": [],
  "fields": [
    { "field": "name", "label": "Name", "kind": "text", "required": true, "searchable": true },
    { "field": "status", "label": "Status", "kind": "enum", "options": { "enum": ["ready", "cleaning", "archived"], "default": "ready" } },
    { "field": "description", "label": "Description", "kind": "text" }
  ]
}'

say "type: cleaner_file (CLF, scoped under a project)"
post /api/types '{
  "type_id": "cleaner_file", "id_prefix": "CLF",
  "display_name": "File", "display_name_plural": "Files",
  "scope_parents": ["project_id"],
  "fields": [
    { "field": "project_id", "label": "Project", "kind": "ref", "required": true, "editable": false, "options": { "ref": "CLP" } },
    { "field": "filename", "label": "Filename", "kind": "text", "required": true, "searchable": true },
    { "field": "source_url", "label": "Source URL", "kind": "text" },
    { "field": "rows", "label": "Rows", "kind": "int" },
    { "field": "cols", "label": "Columns", "kind": "int" },
    { "field": "size_bytes", "label": "Size (bytes)", "kind": "int" },
    { "field": "score", "label": "Cleanness", "kind": "int" },
    { "field": "steps", "label": "Steps", "kind": "json", "options": { "default": [] } },
    { "field": "columns_meta", "label": "Columns meta", "kind": "json" }
  ]
}'

say "type: cleaner_view (CLV, scoped under a file)"
post /api/types '{
  "type_id": "cleaner_view", "id_prefix": "CLV",
  "display_name": "Saved view", "display_name_plural": "Saved views",
  "scope_parents": ["file_id"],
  "fields": [
    { "field": "file_id", "label": "File", "kind": "ref", "required": true, "editable": false, "options": { "ref": "CLF" } },
    { "field": "name", "label": "Name", "kind": "text", "required": true, "searchable": true },
    { "field": "query", "label": "Query", "kind": "json" }
  ]
}'

say "types now registered:"
curl -sS -b "$JAR" "$BIRAMA/api/types" | head -c 600
printf '\n\nseed done — the app self-seeds the dossier project on first connect.\n'
