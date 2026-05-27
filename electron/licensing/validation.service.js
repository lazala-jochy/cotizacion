const fs = require('fs');
const path = require('path');
const { sha256, stableStringify, verifySignature, normalizeProductKey, isValidKeyFormat, validateKeyChecksum } = require('./crypto.service');

const CATALOG_PATH = path.join(__dirname, '..', '..', 'asset', 'licensing', 'product-catalog.json');

function readCatalogRaw() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error('No existe catálogo de licencias');
  }
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
}

function validateCatalogSignature(catalog) {
  if (!catalog || typeof catalog !== 'object') throw new Error('Catálogo inválido');
  if (!catalog.payload || !catalog.signature) throw new Error('Catálogo incompleto');

  const payloadCanonical = stableStringify(catalog.payload);
  if (!verifySignature(payloadCanonical, catalog.signature)) {
    throw new Error('Catálogo de licencias alterado (firma inválida)');
  }
  return catalog.payload;
}

function validateCatalogEntry(entry) {
  const missing = ['licenseId', 'keyHash', 'plan', 'expiresAt', 'features', 'issuedAt'].filter(
    (k) => entry[k] === undefined || entry[k] === null
  );
  if (missing.length) throw new Error(`Licencia del catálogo inválida: faltan ${missing.join(', ')}`);
  if (!Array.isArray(entry.features)) throw new Error('Licencia del catálogo inválida: features no es arreglo');
}

function resolveEntryByProductKey(productKey) {
  const normalized = normalizeProductKey(productKey);
  if (!isValidKeyFormat(normalized)) throw new Error('Formato de Product Key inválido');
  if (!validateKeyChecksum(normalized)) throw new Error('Product Key inválido (checksum)');

  const payload = validateCatalogSignature(readCatalogRaw());
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const keyHash = sha256(normalized);
  const entry = entries.find((item) => item.keyHash === keyHash);
  if (!entry) throw new Error('Product Key no válido');

  validateCatalogEntry(entry);

  const expires = new Date(`${entry.expiresAt}T23:59:59`);
  if (Number.isNaN(expires.getTime())) throw new Error('Licencia con expiración inválida');
  if (expires < new Date()) throw new Error('La licencia está expirada');

  return { entry, keyHash, payloadMeta: { version: payload.version || 1, issuedAt: payload.issuedAt || null } };
}

module.exports = {
  resolveEntryByProductKey,
  validateCatalogSignature,
  readCatalogRaw,
};
