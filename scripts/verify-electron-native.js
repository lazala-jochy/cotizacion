#!/usr/bin/env node
const path = require('path');
const { spawnSync } = require('child_process');

const electron = require('electron');
const script = path.join(__dirname, 'test-electron-db.js');

const r = spawnSync(electron, [script], { stdio: 'inherit' });

if (r.status !== 0) {
  console.error('\n❌ better-sqlite3 no es compatible con Electron. Ejecuta: npm run rebuild:electron');
  process.exit(1);
}
