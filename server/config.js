const fs = require('fs');
const path = require('path');

const PORT = 3847;

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key in process.env) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile();

const BASE_URL = (process.env.BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, '');

/** Enlace al PDF en el correo (misma BASE_URL que usa la app). */
function buildPdfUrl(pdfToken) {
  if (!pdfToken) return null;
  return `${BASE_URL}/api/public/pdf/${pdfToken}`;
}

module.exports = {
  PORT,
  JWT_SECRET: process.env.JWT_SECRET || 'cotizaciones-app-dev-secret-change-in-prod',
  JWT_EXPIRES: '7d',
  BASE_URL,
  buildPdfUrl,
};
