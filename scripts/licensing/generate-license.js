#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function base64UrlEncode(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key && key.startsWith('--')) args[key.slice(2)] = value;
  }
  return args;
}

function randomChars(size) {
  const bytes = crypto.randomBytes(size * 2);
  let out = '';
  for (const b of bytes) {
    out += KEY_ALPHABET[b % KEY_ALPHABET.length];
    if (out.length === size) break;
  }
  return out;
}

function computeCheckChar(first15Chars) {
  const digest = sha256(first15Chars);
  const idx = parseInt(digest.slice(0, 8), 16) % KEY_ALPHABET.length;
  return KEY_ALPHABET[idx];
}

function formatKey(compact16) {
  return compact16.match(/.{1,4}/g).join('-');
}

function signPayload(privateKeyPem, payloadCanonical) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(payloadCanonical);
  signer.end();
  return base64UrlEncode(signer.sign(privateKeyPem));
}

const args = parseArgs(process.argv);
const required = ['plan', 'expiresAt', 'features'];
for (const field of required) {
  if (!args[field]) {
    console.error(`Falta --${field}`);
    process.exit(1);
  }
}

const privateKeyPath = args.privateKey || path.join(__dirname, 'license-private.pem');
const catalogPath = args.catalog || path.join(__dirname, '..', '..', 'asset', 'licensing', 'product-catalog.json');

if (!fs.existsSync(privateKeyPath)) {
  console.error(`No existe private key: ${privateKeyPath}`);
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
let catalog = { payload: { version: 1, issuedAt: new Date().toISOString(), entries: [] }, signature: '' };
if (fs.existsSync(catalogPath)) {
  catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
}

catalog.payload = catalog.payload || { version: 1, issuedAt: new Date().toISOString(), entries: [] };
catalog.payload.entries = Array.isArray(catalog.payload.entries) ? catalog.payload.entries : [];

let compact = '';
let keyHash = '';
do {
  const first15 = randomChars(15);
  compact = `${first15}${computeCheckChar(first15)}`;
  keyHash = sha256(compact);
} while (catalog.payload.entries.some((x) => x.keyHash === keyHash));

const licenseId = args.licenseId || `LIC-${Date.now().toString(36).toUpperCase()}`;
const features = args.features.split(',').map((x) => x.trim()).filter(Boolean);

catalog.payload.entries.push({
  licenseId,
  keyHash,
  plan: args.plan,
  expiresAt: args.expiresAt,
  issuedAt: args.issuedAt || new Date().toISOString().slice(0, 10),
  features,
  notes: args.notes || '',
});

catalog.payload.issuedAt = new Date().toISOString();
const canonical = stableStringify(catalog.payload);
catalog.signature = signPayload(privateKey, canonical);

fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

console.log('Product Key generado:');
console.log(formatKey(compact));
console.log('licenseId:', licenseId);
console.log('plan:', args.plan);
console.log('expiresAt:', args.expiresAt);
console.log('features:', features.join(','));
console.log('catalog:', catalogPath);
