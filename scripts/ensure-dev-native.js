#!/usr/bin/env node
/** Sale 0 si better-sqlite3 carga con el Node actual; 1 si hace falta npm run rebuild:dev */
try {
  require('better-sqlite3');
  process.exit(0);
} catch {
  process.exit(1);
}
