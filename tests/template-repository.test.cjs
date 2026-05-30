const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const REPO_PATH = path.join(__dirname, '../server/templates/templateRepository.js');

describe('quote_templates setDefault SQL', () => {
  test('setDefault usa datetime(\'now\') con comillas simples', () => {
    const src = fs.readFileSync(REPO_PATH, 'utf8');
    assert.match(src, /SET is_default = 1, updated_at = datetime\('now'\)/);
    assert.ok(!/datetime\s*\(\s*"now"\s*\)/.test(src), 'no debe usar comillas dobles');
  });

  test('create y update también usan datetime(\'now\')', () => {
    const src = fs.readFileSync(REPO_PATH, 'utf8');
    const matches = src.match(/datetime\('now'\)/g) || [];
    assert.ok(matches.length >= 3, 'debe haber varios datetime(\'now\') en el repositorio');
  });
});
