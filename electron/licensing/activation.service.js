const { dialog } = require('electron');
const { getMachineIdentity } = require('./machine.service');
const { getCurrentLicenseStatus, installLicenseFromFile, installLicenseFromText } = require('./license.service');

function getActivationState() {
  const status = getCurrentLicenseStatus();
  const { machineId } = getMachineIdentity();
  return {
    machineId,
    valid: status.valid,
    license: status.license || null,
    reason: status.reason || '',
    expiresAt: status.expiresAt || null,
    activatedAt: status.activatedAt || null,
  };
}

async function pickAndActivateLicense(mainWindow) {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar archivo de licencia',
    buttonLabel: 'Importar',
    properties: ['openFile'],
    filters: [
      { name: 'Licencia', extensions: ['lic', 'dat', 'txt'] },
      { name: 'Todos', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePaths.length) {
    return { ok: false, canceled: true, message: 'Importación cancelada' };
  }

  try {
    const installed = installLicenseFromFile(result.filePaths[0]);
    return { ok: true, canceled: false, license: installed.license };
  } catch (err) {
    return { ok: false, canceled: false, message: err.message || 'No se pudo activar la licencia' };
  }
}

function activateLicenseFromText(licenseText) {
  try {
    const installed = installLicenseFromText(licenseText);
    return { ok: true, license: installed.license };
  } catch (err) {
    return { ok: false, message: err.message || 'No se pudo activar la licencia' };
  }
}

module.exports = {
  getActivationState,
  pickAndActivateLicense,
  activateLicenseFromText,
};
