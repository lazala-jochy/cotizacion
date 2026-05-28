const fs = require('fs');
const os = require('os');
const path = require('path');
const { BrowserWindow } = require('electron');

async function generatePdfFromHtmlElectron(html) {
  const tmpPath = path.join(os.tmpdir(), `cotizacion-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tmpPath, html, 'utf8');

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await win.loadFile(tmpPath);
    return await win.webContents.printToPDF({
      printBackground: true,
      margins: {
        marginType: 'custom',
        top: 0.35,
        bottom: 0.35,
        left: 0.35,
        right: 0.35,
      },
    });
  } finally {
    win.destroy();
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }
}

module.exports = { generatePdfFromHtmlElectron };
