const packageJson = require('../../package.json');
const { LICENSE_SERVER_URL, LICENSE_ENFORCE } = require('../config');
const { getMachineId } = require('./machineId');
const { getStoredLicense, saveLicense, clearLicense } = require('./licenseStore');
const { appendSyncLog } = require('./licenseSyncLog');
const { needsLicenseSync } = require('./licenseSyncPolicy');
const { MODULE_CODES } = require('./modules');

const LICENSE_IN_USE_MSG =
  'Este product key ya está en uso en otro equipo. Contacte a Lazala Innovaciones para obtener asistencia.';

function isEnforced() {
  return LICENSE_ENFORCE;
}

function normalizeProductKey(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function normalizeModuleList(modules) {
  if (!Array.isArray(modules)) return [];
  return [...new Set(modules.map((c) => String(c || '').trim()).filter(Boolean))];
}

function parseModules(row) {
  try {
    const parsed = JSON.parse(row?.modules_json || '[]');
    return normalizeModuleList(parsed);
  } catch {
    return [];
  }
}

function mapLicenseError(data, status) {
  if (data?.code === 'LICENSE_IN_USE') return LICENSE_IN_USE_MSG;
  if (status === 403 && /límite de equipos|en uso/i.test(data?.error || '')) {
    return LICENSE_IN_USE_MSG;
  }
  return data?.error || 'No se pudo consultar la licencia';
}

function hasValidLicense() {
  const row = getStoredLicense();
  if (!row?.product_key) return false;
  return parseModules(row).length > 0;
}

function rowToStatus(row, extra = {}) {
  if (!row?.product_key) {
    return {
      active: false,
      required: true,
      modules: [],
      needsSync: false,
      machineId: getMachineId(),
      ...extra,
    };
  }
  const modules = parseModules(row);
  return {
    active: modules.length > 0,
    required: true,
    productKey: row.product_key,
    customerName: row.customer_name || null,
    modules,
    expiresAt: row.expires_at || null,
    lastSyncAt: row.last_license_sync || null,
    needsSync: needsLicenseSync(row),
    machineId: row.machine_id || getMachineId(),
    ...extra,
  };
}

function getStatus() {
  return rowToStatus(getStoredLicense());
}

function hasModule(moduleCode) {
  if (!hasValidLicense()) return false;
  return getStatus().modules.includes(moduleCode);
}

async function fetchFromLicenseServer(endpoint, productKey, source = 'manual') {
  const normalized = normalizeProductKey(productKey);
  if (!normalized) throw new Error('Product key requerido');

  const machineId = getMachineId();
  const hostname = require('os').hostname();
  const appVersion = packageJson.version;

  const res = await fetch(`${LICENSE_SERVER_URL}/api/licenses/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productKey: normalized, machineId, hostname, appVersion }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = mapLicenseError(data, res.status);
    appendSyncLog({
      productKey: normalized,
      machineId,
      modules: [],
      result: data?.code === 'LICENSE_IN_USE' ? 'in_use' : 'error',
      message,
      source,
    });
    const err = new Error(message);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }

  const modules = normalizeModuleList(data.license?.modules);
  if (!modules.length) throw new Error('La licencia no tiene módulos asignados');

  const unknown = modules.filter((c) => !MODULE_CODES.includes(c));
  if (unknown.length) {
    console.warn('[license] módulos del servidor aún no en esta versión de la app:', unknown.join(', '));
  }

  saveLicense({
    productKey: data.license.productKey || normalized,
    machineId,
    modules,
    customerName: data.license.customerName,
    expiresAt: data.license.expiresAt,
    syncedAt: new Date().toISOString(),
  });

  appendSyncLog({
    productKey: data.license.productKey || normalized,
    machineId,
    modules,
    result: 'ok',
    message: null,
    source,
  });

  return rowToStatus(getStoredLicense());
}

async function activateProductKey(productKey) {
  return fetchFromLicenseServer('activate', productKey, 'activate');
}

async function refreshFromServer(source = 'manual') {
  const row = getStoredLicense();
  if (!row?.product_key) return getStatus();

  try {
    return await fetchFromLicenseServer('activate', row.product_key, source);
  } catch (err) {
    if (err.status === 403) {
      const revokedMessage = err.message || 'Su licencia ya no está activa.';
      appendSyncLog({
        productKey: row.product_key,
        machineId: getMachineId(),
        modules: parseModules(row),
        result: err.code === 'LICENSE_IN_USE' ? 'in_use' : 'revoked',
        message: revokedMessage,
        source,
      });
      clearLicense();
      return {
        ...getStatus(),
        revoked: true,
        revokedMessage,
      };
    }
    const cached = rowToStatus(row, { stale: true, error: err.message });
    if (cached.active) return cached;
    throw err;
  }
}

function deactivate() {
  clearLicense();
  return getStatus();
}

module.exports = {
  isEnforced,
  hasValidLicense,
  getStatus,
  hasModule,
  activateProductKey,
  refreshFromServer,
  deactivate,
  getMachineId,
  LICENSE_IN_USE_MSG,
};
