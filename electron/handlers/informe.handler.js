const { shell } = require('electron');
const path = require('path');
const { readWorkbookMeta } = require('../informe/utils');
const { buildPreview } = require('../informe/processData');
const { generateReportExcel } = require('../informe/generateExcel');

function registerInformeHandlers(ipcMain, dialog) {
  ipcMain.handle('informe:pick-excel', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Seleccionar archivo Excel',
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls', 'csv'] }],
    });
    if (result.canceled || !result.filePaths?.length) {
      return { canceled: true };
    }
    const filePath = result.filePaths[0];
    return { canceled: false, filePath, fileName: path.basename(filePath) };
  });

  ipcMain.handle('informe:read-excel', async (_event, filePath) => {
    if (!filePath) throw new Error('Ruta de archivo requerida');
    const meta = readWorkbookMeta(filePath);
    return meta;
  });

  ipcMain.handle('informe:preview-data', async (_event, { filePath, config, sections }) => {
    if (!filePath) throw new Error('Ruta de archivo requerida');
    return buildPreview(filePath, config, sections);
  });

  ipcMain.handle('informe:generate', async (_event, { filePath, config, sections, title }) => {
    if (!filePath) throw new Error('Ruta de archivo requerida');

    const save = await dialog.showSaveDialog({
      title: 'Guardar informe',
      defaultPath: `informe-${new Date().toISOString().slice(0, 10)}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });

    if (save.canceled || !save.filePath) {
      return { success: false, canceled: true };
    }

    try {
      const outputPath = save.filePath.endsWith('.xlsx') ? save.filePath : `${save.filePath}.xlsx`;
      await generateReportExcel({ filePath, outputPath, config, sections, title });
      await shell.openPath(outputPath);
      return { success: true, outputPath };
    } catch (err) {
      return { success: false, error: err.message || 'Error al generar el informe' };
    }
  });
}

module.exports = { registerInformeHandlers };
