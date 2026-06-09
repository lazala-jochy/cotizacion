export function isInformeElectron() {
  return Boolean(typeof window !== 'undefined' && window.electronAPI?.informe);
}

function getApi() {
  if (!isInformeElectron()) {
    throw new Error('El módulo Informe requiere la aplicación de escritorio (Electron).');
  }
  return window.electronAPI.informe;
}

export async function pickExcel() {
  return getApi().pickExcel();
}

export async function readExcel(filePath) {
  return getApi().readExcel(filePath);
}

export async function previewData(payload) {
  return getApi().previewData(payload);
}

export async function generateReport(payload) {
  return getApi().generate(payload);
}
