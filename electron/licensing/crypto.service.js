const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PUBLIC_KEY_PATH = path.join(__dirname, '..', '..', 'asset', 'licensing', 'license-public.pem');

/** Debe coincidir con scripts/licensing/generate-license.js */
const LICENSE_ENVELOPE_SALT = 'cotizaciones-offline-license/v1';

function readPublicKey() {
  return fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
}

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function base64UrlEncode(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function verifySignature(payloadCanonical, signatureB64) {
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(payloadCanonical);
  verifier.end();
  return verifier.verify(readPublicKey(), base64UrlDecode(signatureB64));
}

function deriveLicenseKey(machineId) {
  const normalized = String(machineId || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  return crypto
    .createHash('sha256')
    .update(`${normalized}|${LICENSE_ENVELOPE_SALT}`)
    .digest();
}

function aes256GcmEncrypt(plaintextUtf8, machineId) {
  const key = deriveLicenseKey(machineId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintextUtf8, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    data: enc.toString('base64'),
    tag: tag.toString('base64'),
  };
}

function aes256GcmDecrypt({ ivHex, dataB64, tagB64 }, machineId) {
  const key = deriveLicenseKey(machineId);
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString('utf8');
}

module.exports = {
  LICENSE_ENVELOPE_SALT,
  sha256,
  stableStringify,
  base64UrlEncode,
  base64UrlDecode,
  verifySignature,
  readPublicKey,
  deriveLicenseKey,
  aes256GcmDecrypt,
  aes256GcmEncrypt,
};
