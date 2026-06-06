#!/usr/bin/env node
/**
 * Genera server/runtime-env.json desde .env antes del build/dist.
 * La app empaquetada (Electron) no incluye .env; lee este archivo en runtime.
 */
const fs = require('fs');
const path = require('path');
const { parseEnvFile, envFilePath, projectRoot } = require('../server/load-env-file');

const RUNTIME_KEYS = ['LICENSE_SERVER_URL', 'LICENSE_ENFORCE', 'BASE_URL', 'JWT_SECRET'];

const DEFAULTS = {
  LICENSE_SERVER_URL: 'http://127.0.0.1:3948',
  LICENSE_ENFORCE: 'true',
};

function main() {
  const fromEnv = parseEnvFile(envFilePath());
  const runtime = { generatedAt: new Date().toISOString() };

  for (const key of RUNTIME_KEYS) {
    const val = fromEnv[key] ?? process.env[key] ?? DEFAULTS[key];
    if (val !== undefined && val !== '') runtime[key] = val;
  }

  const outPath = path.join(projectRoot(), 'server', 'runtime-env.json');
  fs.writeFileSync(outPath, `${JSON.stringify(runtime, null, 2)}\n`, 'utf8');

  const safeLog = {
    ...runtime,
    JWT_SECRET: runtime.JWT_SECRET ? '(definido)' : undefined,
  };
  console.log('[build] runtime-env.json generado:', safeLog);
}

main();
