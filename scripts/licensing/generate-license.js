#!/usr/bin/env node
/**
 * Genera archivo .lic firmado (RSA) y cifrado (AES-256-GCM ligado al Machine ID del cliente).
 * Uso: node scripts/licensing/generate-license.js --machineId "XXXX-XXXX-XXXX-XXXX" --company "..." ...
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const cryptoSvc = path.join(__dirname, '..', '..', 'electron', 'licensing', 'crypto.service.js');
const { stableStringify, base64UrlEncode, aes256GcmEncrypt } = require(cryptoSvc);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key && key.startsWith('--')) args[key.slice(2)] = value;
  }
  return args;
}

function signEnvelope(privateKeyPem, signInput) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  signer.end();
  return base64UrlEncode(signer.sign(privateKeyPem));
}

const args = parseArgs(process.argv);
const required = ['machineId', 'company', 'expiresAt', 'plan', 'features'];
for (const field of required) {
  if (!args[field]) {
    console.error(`Falta --${field}`);
    process.exit(1);
  }
}

const privateKeyPath = args.privateKey || path.join(__dirname, 'license-private.pem');
const outPath = args.out || path.join(process.cwd(), 'empresa-demo.lic');

if (!fs.existsSync(privateKeyPath)) {
  console.error(`No existe private key: ${privateKeyPath}`);
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const machineId = String(args.machineId).trim();
const features = args.features.split(',').map((x) => x.trim()).filter(Boolean);

const innerPayload = {
  company: args.company,
  machineId,
  issuedAt: args.issuedAt || new Date().toISOString().slice(0, 10),
  expiresAt: args.expiresAt,
  plan: args.plan,
  features,
};

const innerCanonical = stableStringify(innerPayload);
const { iv, data, tag } = aes256GcmEncrypt(innerCanonical, machineId);

const envelope = {
  v: 1,
  iv,
  data,
  tag,
};

const signInput = stableStringify({ v: envelope.v, iv: envelope.iv, data: envelope.data, tag: envelope.tag });
envelope.signature = signEnvelope(privateKey, signInput);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(envelope), { mode: 0o600 });

console.log('Archivo de licencia generado:', outPath);
console.log('Machine ID:', machineId);
console.log('Plan:', args.plan);
console.log('Expira:', args.expiresAt);
