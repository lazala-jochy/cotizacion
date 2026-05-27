const crypto = require('crypto');
const os = require('os');
const { execSync } = require('child_process');

function run(command) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2500 })
      .toString('utf8')
      .trim();
  } catch {
    return '';
  }
}

function normalize(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function getMotherboardId() {
  if (process.platform === 'darwin') {
    return run(
      "ioreg -rd1 -c IOPlatformExpertDevice | awk -F'\"' '/IOPlatformUUID/{print $(NF-1)}'"
    );
  }
  if (process.platform === 'win32') {
    return run('wmic baseboard get serialnumber | findstr /R /V "^$"');
  }
  return run("cat /sys/class/dmi/id/board_serial 2>/dev/null || cat /sys/class/dmi/id/product_uuid 2>/dev/null");
}

function getCpuId() {
  if (process.platform === 'darwin') return run('sysctl -n machdep.cpu.brand_string');
  if (process.platform === 'win32') return run('wmic cpu get processorid | findstr /R /V "^$"');
  return run("cat /proc/cpuinfo | awk -F: '/model name/{print $2; exit}'");
}

function getDiskId() {
  if (process.platform === 'darwin') {
    return run("diskutil info / | awk -F: '/Volume UUID/{print $2}'");
  }
  if (process.platform === 'win32') {
    return run('wmic diskdrive get serialnumber | findstr /R /V "^$"');
  }
  return run("lsblk -ndo SERIAL | head -n 1 || cat /etc/machine-id 2>/dev/null");
}

function getMacAddressFingerprint() {
  const interfaces = os.networkInterfaces();
  const values = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      const mac = String(entry.mac || '').toUpperCase();
      if (!entry.internal && mac && mac !== '00:00:00:00:00:00') values.push(mac);
    }
  }
  return values.sort().join('|');
}

function getMachineFingerprintData() {
  return {
    motherboard: normalize(getMotherboardId()),
    cpu: normalize(getCpuId()),
    disk: normalize(getDiskId()),
    mac: normalize(getMacAddressFingerprint()),
    platform: normalize(`${os.platform()}-${os.arch()}`),
  };
}

function formatMachineIdFromHash(hashHex) {
  const h = String(hashHex).toUpperCase();
  return `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

function createMachineId(data = getMachineFingerprintData()) {
  const seed = [data.motherboard, data.cpu, data.disk, data.mac, data.platform].join('||');
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  return formatMachineIdFromHash(hash);
}

function normalizeMachineIdForCompare(id) {
  return String(id || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

function getMachineIdentity() {
  const fingerprint = getMachineFingerprintData();
  return {
    machineId: createMachineId(fingerprint),
    fingerprint,
  };
}

module.exports = {
  getMachineIdentity,
  createMachineId,
  normalizeMachineIdForCompare,
};
