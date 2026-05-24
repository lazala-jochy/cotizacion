#!/usr/bin/env node
const path = require('path');
const { execSync } = require('child_process');

const nodePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
  'better_sqlite3.node'
);

let out;
try {
  out = execSync(`file "${nodePath}"`, { encoding: 'utf8' });
} catch (e) {
  console.error('No se pudo verificar el binario:', e.message);
  process.exit(1);
}

if (!/PE32|MS Windows/i.test(out)) {
  console.error('El binario no es de Windows:', out.trim());
  console.error('Ejecuta: npm run rebuild:electron:win');
  process.exit(1);
}

console.log('OK: binario Windows —', out.trim());
