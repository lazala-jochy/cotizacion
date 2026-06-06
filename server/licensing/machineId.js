const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function getDataDir() {
  const base =
    process.env.COTIZACION_DATA_DIR ||
    path.join(process.env.HOME || process.env.USERPROFILE || '.', '.cotizaciones-app');
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function getMachineId() {
  const file = path.join(getDataDir(), 'machine.id');
  if (fs.existsSync(file)) {
    const id = fs.readFileSync(file, 'utf8').trim();
    if (id) return id;
  }
  const id = crypto.randomUUID();
  fs.writeFileSync(file, id, 'utf8');
  return id;
}

module.exports = { getMachineId, getDataDir };
