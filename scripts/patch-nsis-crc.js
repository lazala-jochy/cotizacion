#!/usr/bin/env node
/**
 * NSIS generado en macOS puede fallar al desinstalar con "Installer integrity check has failed".
 * Añade CRCCheck off a la plantilla de electron-builder (solo si falta).
 */
const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '..', 'node_modules', 'app-builder-lib', 'templates', 'nsis', 'common.nsh'),
  path.join(
    __dirname,
    '..',
    'node_modules',
    'electron-builder',
    'node_modules',
    'app-builder-lib',
    'templates',
    'nsis',
    'common.nsh'
  ),
];

const commonNsh = candidates.find((p) => fs.existsSync(p));

if (!commonNsh) {
  console.warn('[patch-nsis] common.nsh no encontrado (¿npm install?)');
  process.exit(0);
}

const marker = 'CRCCheck off';
let content = fs.readFileSync(commonNsh, 'utf8');

if (content.includes(marker)) {
  console.log('[patch-nsis] Ya aplicado:', commonNsh);
  process.exit(0);
}

fs.writeFileSync(commonNsh, `${content.trimEnd()}\n${marker}\n`, 'utf8');
console.log('[patch-nsis] CRCCheck off →', commonNsh);
