const fs = require('fs');
const path = require('path');

/**
 * Genera TXT para envío DGII.
 * La DGII publica plantillas Excel que generan el TXT final; este exportador
 * produce líneas delimitadas por pipe (|) alineadas al orden de campos del instructivo.
 * Debe validarse con la herramienta de pre-validación oficial antes de la OFV.
 */
function escapeField(value) {
  if (value == null || value === '') return '';
  return String(value).replace(/\|/g, ' ').replace(/\r?\n/g, ' ').trim();
}

function formatAmount(n) {
  const num = Number(n) || 0;
  return num.toFixed(2);
}

function formatDateYmd(dateStr) {
  if (!dateStr) return '';
  const d = String(dateStr).slice(0, 10).replace(/-/g, '');
  return d.length === 8 ? d : '';
}

function buildPipeFile({ headerLine, detailLines }) {
  const lines = [];
  if (headerLine) lines.push(headerLine);
  for (const row of detailLines) {
    lines.push(row.map(escapeField).join('|'));
  }
  return `${lines.join('\r\n')}\r\n`;
}

function ensureExportDir(userId) {
  const base =
    process.env.COTIZACION_DATA_DIR ||
    path.join(process.env.HOME || process.env.USERPROFILE || '.', '.cotizaciones-app');
  const dir = path.join(base, 'dgii-exports', String(userId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeTxtFile(userId, reportType, period, content) {
  const dir = ensureExportDir(userId);
  const filename = `DGII_F_${reportType}_${period}_${Date.now()}.txt`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

module.exports = {
  escapeField,
  formatAmount,
  formatDateYmd,
  buildPipeFile,
  writeTxtFile,
  ensureExportDir,
};
