const fs = require('fs');
const path = require('path');

/** Lee un archivo .env y devuelve un objeto clave → valor. */
function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function projectRoot() {
  return path.join(__dirname, '..');
}

function envFilePath() {
  return path.join(projectRoot(), '.env');
}

module.exports = {
  parseEnvFile,
  projectRoot,
  envFilePath,
};
