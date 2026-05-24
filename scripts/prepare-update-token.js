#!/usr/bin/env node
/**
 * Guarda GH_TOKEN en electron/update-token.json para que la app instalada
 * pueda leer releases de un repo privado. Se ejecuta antes de dist / dist:publish.
 */
const fs = require('fs');
const path = require('path');

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const outPath = path.join(__dirname, '..', 'electron', 'update-token.json');
const requireToken = process.argv.includes('--require');

if (!token) {
  const msg =
    'GH_TOKEN no está definido. Para repo privado: export GH_TOKEN=ghp_... antes de npm run dist:publish';
  if (requireToken) {
    console.error(msg);
    process.exit(1);
  }
  console.warn(msg);
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  process.exit(0);
}

fs.writeFileSync(outPath, JSON.stringify({ token }, null, 0), 'utf8');
console.log('Token de actualizaciones preparado (electron/update-token.json)');
