const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { sha256, stableStringify } = require('./crypto.service');
const { resolveEntryByProductKey, validateCatalogSignature, readCatalogRaw } = require('./validation.service');

const LICENSE_DIR = 'license';
const ACTIVATION_FILE = 'activation.dat';

function getActivationPath() {
  const dir = path.join(app.getPath('userData'), LICENSE_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, ACTIVATION_FILE);
}

function buildRecordHash(record) {
  return sha256(stableStringify(record));
}

function readActivationRecord() {
  const activationPath = getActivationPath();
  if (!fs.existsSync(activationPath)) return null;
  const raw = fs.readFileSync(activationPath, 'utf8');
  const data = JSON.parse(raw);
  const { recordHash, ...record } = data;
  if (!recordHash || recordHash !== buildRecordHash(record)) {
    throw new Error('Registro de activación alterado');
  }
  return record;
}

function writeActivationRecord(record) {
  const activationPath = getActivationPath();
  const recordHash = buildRecordHash(record);
  fs.writeFileSync(activationPath, JSON.stringify({ ...record, recordHash }, null, 2), { mode: 0o600 });
}

function licenseFromEntry(entry) {
  return {
    licenseId: entry.licenseId,
    plan: entry.plan,
    expiresAt: entry.expiresAt,
    issuedAt: entry.issuedAt,
    features: entry.features,
  };
}

function activateWithProductKey(productKey) {
  const resolved = resolveEntryByProductKey(productKey);
  const record = {
    keyHash: resolved.keyHash,
    licenseId: resolved.entry.licenseId,
    activatedAt: new Date().toISOString(),
    catalogVersion: resolved.payloadMeta.version,
  };
  writeActivationRecord(record);
  return { valid: true, license: licenseFromEntry(resolved.entry) };
}

function getCurrentLicenseStatus() {
  try {
    const catalog = readCatalogRaw();
    const payload = validateCatalogSignature(catalog);
    const record = readActivationRecord();

    if (!record) return { valid: false, reason: 'Software no activado' };

    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    const entry = entries.find((item) => item.keyHash === record.keyHash);
    if (!entry) return { valid: false, reason: 'Activación inválida o revocada' };

    const expires = new Date(`${entry.expiresAt}T23:59:59`);
    if (Number.isNaN(expires.getTime())) return { valid: false, reason: 'Licencia con expiración inválida' };
    if (expires < new Date()) return { valid: false, reason: 'La licencia está expirada' };

    return {
      valid: true,
      license: licenseFromEntry(entry),
      activatedAt: record.activatedAt,
      expiresAt: entry.expiresAt,
    };
  } catch (err) {
    return { valid: false, reason: err.message || 'Licencia inválida' };
  }
}

module.exports = {
  getCurrentLicenseStatus,
  activateWithProductKey,
  getActivationPath,
};
