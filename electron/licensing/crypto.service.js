const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PUBLIC_KEY_PATH = path.join(__dirname, '..', '..', 'asset', 'licensing', 'license-public.pem');
const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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

function normalizeProductKey(key) {
  return String(key || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function formatProductKey(compact) {
  const normalized = normalizeProductKey(compact);
  return normalized.match(/.{1,4}/g)?.join('-') || normalized;
}

function isValidKeyFormat(compactKey) {
  const normalized = normalizeProductKey(compactKey);
  return normalized.length === 16 && [...normalized].every((c) => KEY_ALPHABET.includes(c));
}

function computeCheckChar(first15Chars) {
  const digest = sha256(first15Chars);
  const checksum = parseInt(digest.slice(0, 8), 16) % KEY_ALPHABET.length;
  return KEY_ALPHABET[checksum];
}

function validateKeyChecksum(compactKey) {
  const normalized = normalizeProductKey(compactKey);
  if (!isValidKeyFormat(normalized)) return false;
  const core = normalized.slice(0, 15);
  const check = normalized[15];
  return computeCheckChar(core) === check;
}

module.exports = {
  KEY_ALPHABET,
  sha256,
  stableStringify,
  base64UrlEncode,
  base64UrlDecode,
  verifySignature,
  normalizeProductKey,
  formatProductKey,
  isValidKeyFormat,
  computeCheckChar,
  validateKeyChecksum,
};
