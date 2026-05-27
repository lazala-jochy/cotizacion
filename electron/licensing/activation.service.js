const { getCurrentLicenseStatus, activateWithProductKey } = require('./license.service');
const { formatProductKey } = require('./crypto.service');

function getActivationState() {
  const status = getCurrentLicenseStatus();
  return {
    valid: status.valid,
    license: status.license || null,
    reason: status.reason || '',
    expiresAt: status.expiresAt || null,
    activatedAt: status.activatedAt || null,
  };
}

function activateProductKey(rawKey) {
  try {
    const normalized = formatProductKey(rawKey);
    const activated = activateWithProductKey(rawKey);
    return { ok: true, productKey: normalized, license: activated.license };
  } catch (err) {
    return { ok: false, message: err.message || 'No se pudo activar la licencia' };
  }
}

module.exports = { getActivationState, activateProductKey };
