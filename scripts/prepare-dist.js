#!/usr/bin/env node
/**
 * Preparación única antes de dist / dist:publish:
 * 1) runtime-env.json desde .env (LICENSE_SERVER_URL, etc.)
 * 2) update-token.json desde GH_TOKEN (releases privados)
 */
const { spawnSync } = require('child_process');
const path = require('path');

const requireToken = process.argv.includes('--require');
const root = path.join(__dirname, '..');

function run(script, extraArgs = []) {
  const res = spawnSync(process.execPath, [path.join(__dirname, script), ...extraArgs], {
    cwd: root,
    stdio: 'inherit',
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

console.log('[dist] Preparando variables de entorno para el instalador…');
run('generate-runtime-env.js');

console.log('[dist] Preparando token de actualizaciones…');
run('prepare-update-token.js', requireToken ? ['--require'] : []);
