const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Misma lógica que license-server (sin ESM en test runner)
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomSegment(length = 5) {
  const crypto = require('crypto');
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join('');
}

function generateProductKey() {
  const parts = Array.from({ length: 5 }, () => randomSegment(5));
  return `LISC-${parts.join('-')}`;
}

function normalizeProductKey(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function isValidProductKeyFormat(key) {
  return /^LISC-[A-Z2-9]{5}(-[A-Z2-9]{5}){4}$/.test(normalizeProductKey(key));
}

describe('product key', () => {
  it('genera formato LISC-XXXXX-...', () => {
    const key = generateProductKey();
    assert.ok(isValidProductKeyFormat(key));
    assert.equal(key.split('-').length, 6);
  });

  it('normaliza espacios', () => {
    assert.equal(
      normalizeProductKey('lisc-abcd2-efgh3'),
      'LISC-ABCD2-EFGH3'
    );
  });
});
