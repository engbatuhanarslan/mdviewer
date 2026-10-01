#!/bin/zsh
cd "${0:A:h}"
PORT=4173
URL="http://127.0.0.1:$PORT"

if curl --silent --fail "$URL/api/documents" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

if command -v node >/dev/null 2>&1; then
  exec node server.mjs
else
  echo "Node.js bulunamadı. Local MD başlatılamadı."
  read "?Kapatmak için Enter'a bas..."
fi
