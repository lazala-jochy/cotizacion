try {
  require('../server/db');
  console.log('OK: better-sqlite3 carga en Electron');
  process.exit(0);
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
}
