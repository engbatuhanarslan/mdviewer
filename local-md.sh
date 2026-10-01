#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js bulunamadı. Paketli Linux sürümünü kullanın veya Node.js kurun."
  exit 1
fi

exec node server.mjs
