#!/usr/bin/env node
/**
 * Descarga el binario precompilado de better-sqlite3 para Electron + plataforma.
 * Necesario para generar .exe en Mac (electron-rebuild no cruza bien Mac→Win).
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const platform = process.argv[2];
const arch = process.argv[3] || (platform === 'darwin' ? process.arch : 'x64');

if (!platform) {
  console.error('Uso: node scripts/rebuild-sqlite.js <darwin|win32> [arch]');
  process.exit(1);
}

const electronVersion = require('electron/package.json').version;
const sqliteDir = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');
const nodePath = path.join(sqliteDir, 'build', 'Release', 'better_sqlite3.node');

console.log(`better-sqlite3 → electron ${electronVersion}, ${platform}-${arch}`);

const r = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'prebuild-install',
    '--platform',
    platform,
    '--arch',
    arch,
    '--runtime',
    'electron',
    '--target',
    electronVersion,
  ],
  { cwd: sqliteDir, stdio: 'inherit' }
);

if (r.status !== 0) {
  if (platform !== 'darwin') {
    console.error('prebuild-install falló');
    process.exit(r.status || 1);
  }
  console.warn('prebuild-install no disponible, usando electron-rebuild…');
  const er = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['electron-rebuild', '-f', '-w', 'better-sqlite3'],
    { cwd: path.join(__dirname, '..'), stdio: 'inherit' }
  );
  if (er.status !== 0) process.exit(er.status || 1);
}

if (!fs.existsSync(nodePath)) {
  console.error('No se generó', nodePath);
  process.exit(1);
}

console.log('OK:', nodePath);
