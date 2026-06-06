const fs = require('fs');
const path = require('path');
const { parseEnvFile } = require('./load-env-file');

const PORT = 3847;

function readRuntimeEnvFile() {
  const filePath = path.join(__dirname, 'runtime-env.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const { generatedAt: _g, ...vars } = data;
    return vars;
  } catch {
    return {};
  }
}

function applyMergedEnv() {
  const runtime = readRuntimeEnvFile();
  const dotenv = parseEnvFile(path.join(__dirname, '..', '.env'));

  // Prioridad: process.env (sistema) > .env local > runtime-env.json (build)
  const merged = { ...runtime, ...dotenv };
  for (const [key, val] of Object.entries(merged)) {
    if (key in process.env) continue;
    process.env[key] = val;
  }
}

applyMergedEnv();

const BASE_URL = (process.env.BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, '');

/** Enlace al PDF en el correo (misma BASE_URL que usa la app). */
function buildPdfUrl(pdfToken) {
  if (!pdfToken) return null;
  return `${BASE_URL}/api/public/pdf/${pdfToken}`;
}

/** Servicio externo — ver license-server/ */
const LICENSE_SERVER_URL = (process.env.LICENSE_SERVER_URL || 'http://127.0.0.1:3948').replace(
  /\/$/,
  ''
);
/** Siempre restringir menú y API a los módulos devueltos por el license-server. */
const LICENSE_ENFORCE =
  process.env.LICENSE_ENFORCE !== undefined
    ? process.env.LICENSE_ENFORCE === 'true' || process.env.LICENSE_ENFORCE === '1'
    : true;

module.exports = {
  PORT,
  JWT_SECRET: process.env.JWT_SECRET || 'cotizaciones-app-dev-secret-change-in-prod',
  JWT_EXPIRES: '7d',
  BASE_URL,
  buildPdfUrl,
  LICENSE_SERVER_URL,
  LICENSE_ENFORCE,
};
