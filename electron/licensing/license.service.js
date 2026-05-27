const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { getMachineIdentity } = require('./machine.service');
const { validateLicenseFileContent } = require('./validation.service');

const LICENSE_DIR = 'license';
const STORED_LICENSE_FILE = 'license.dat';

function getLicenseStoragePath() {
  const dir = path.join(app.getPath('userData'), LICENSE_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, STORED_LICENSE_FILE);
}

function readStoredLicenseRaw() {
  const p = getLicenseStoragePath();
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').trim();
}

function licensePayloadToSummary(payload) {
  return {
    company: payload.company,
    plan: payload.plan,
    features: payload.features,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    machineId: payload.machineId,
  };
}

function getCurrentLicenseStatus() {
  const { machineId } = getMachineIdentity();
  const raw = readStoredLicenseRaw();

  if (!raw) {
    return { valid: false, machineId, reason: 'No hay licencia instalada' };
  }

  try {
    const payload = validateLicenseFileContent(raw, machineId);
    let activatedAt = null;
    try {
      activatedAt = fs.statSync(getLicenseStoragePath()).mtime.toISOString();
    } catch {
      /* ignore */
    }
    return {
      valid: true,
      machineId,
      license: licensePayloadToSummary(payload),
      expiresAt: payload.expiresAt,
      activatedAt,
    };
  } catch (err) {
    return { valid: false, machineId, reason: err.message || 'Licencia inválida' };
  }
}

function installLicenseFromFile(sourcePath) {
  const { machineId } = getMachineIdentity();
  const raw = fs.readFileSync(sourcePath, 'utf8').trim();
  const payload = validateLicenseFileContent(raw, machineId);
  fs.writeFileSync(getLicenseStoragePath(), raw, { mode: 0o600 });
  return { valid: true, path: getLicenseStoragePath(), license: licensePayloadToSummary(payload) };
}

function installLicenseFromText(rawText) {
  const { machineId } = getMachineIdentity();
  const raw = String(rawText || '').trim();
  const payload = validateLicenseFileContent(raw, machineId);
  fs.writeFileSync(getLicenseStoragePath(), raw, { mode: 0o600 });
  return { valid: true, path: getLicenseStoragePath(), license: licensePayloadToSummary(payload) };
}

module.exports = {
  getLicenseStoragePath,
  getCurrentLicenseStatus,
  installLicenseFromFile,
  installLicenseFromText,
};
