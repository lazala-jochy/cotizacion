#!/usr/bin/env sh
# Genera instaladores Mac + Windows desde macOS (binarios nativos vía prebuild-install).
set -e

EB_ARGS="$@"
REQUIRE=""
for arg in "$@"; do
  if [ "$arg" = "--publish" ] || [ "$arg" = "--publish=always" ]; then
    REQUIRE="--require"
  fi
done

node scripts/prepare-update-token.js $REQUIRE
npm run build

echo ""
echo "=== Windows (x64) ==="
node scripts/rebuild-sqlite.js win32 x64
node scripts/verify-win-native.js
npx electron-builder --win --x64 $EB_ARGS

echo ""
echo "=== macOS ($(uname -m)) ==="
node scripts/rebuild-sqlite.js darwin "$(uname -m)"
node scripts/verify-electron-native.js
npx electron-builder --mac $EB_ARGS

echo ""
echo "=== Restaurar módulo para desarrollo local ==="
node scripts/rebuild-sqlite.js darwin "$(uname -m)"
npm run rebuild:dev 2>/dev/null || true

echo ""
echo "Listo. Revisa la carpeta release/"
