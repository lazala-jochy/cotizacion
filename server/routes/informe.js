const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const reportBuilder = require('../report_builder/ReportBuilder');

const router = express.Router();
router.use(authMiddleware);

const MAX_BYTES = 12 * 1024 * 1024;

router.post('/analyze', (req, res) => {
  try {
    const contentBase64 = req.body?.contentBase64;
    if (!contentBase64) {
      return res.status(400).json({ error: 'Archivo Excel requerido (contentBase64)' });
    }

    const buffer = Buffer.from(contentBase64, 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'El archivo está vacío' });
    if (buffer.length > MAX_BYTES) return res.status(400).json({ error: 'El archivo supera 12 MB' });

    const data = reportBuilder.analyzeUpload(
      buffer,
      req.body?.fileName || 'informe.xlsx',
      req.user?.id
    );
    res.json(data);
  } catch (err) {
    if (err.code === 'RB_EMPTY') {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    console.error('[informe/analyze]', err);
    return res.status(400).json({ error: err.message || 'No se pudo analizar el archivo' });
  }
});

router.post('/run', (req, res) => {
  try {
    const { datasetId, reportType, selections, config } = req.body || {};
    if (!datasetId) return res.status(400).json({ error: 'datasetId requerido' });
    const data = reportBuilder.executeReport({
      datasetId,
      userId: req.user?.id,
      reportType,
      selections,
      config,
    });
    res.json(data);
  } catch (err) {
    if (err.code === 'RB_DATASET_EXPIRED') {
      return res.status(404).json({ error: err.message, code: err.code });
    }
    console.error('[informe/run]', err);
    return res.status(400).json({ error: err.message || 'No se pudo generar el informe' });
  }
});

router.post('/export', async (req, res) => {
  try {
    const { datasetId, format, rows, summary, title, filters, chartSpec } = req.body || {};
    if (!datasetId) return res.status(400).json({ error: 'datasetId requerido' });
    const exported = await reportBuilder.exportDatasetReport({
      datasetId,
      userId: req.user?.id,
      format: format || 'csv',
      rows: rows || [],
      summary: summary || {},
      title: title || 'Informe',
      filters: filters || [],
      chartSpec,
    });

    if (exported.fallback) {
      return res.json({
        contentType: exported.contentType,
        extension: exported.extension,
        note: exported.note,
        html: exported.html,
      });
    }

    if (exported.binary) {
      res.setHeader('Content-Type', exported.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${(title || 'informe').replace(/[^\w\-]+/g, '_')}.${exported.extension}"`
      );
      return res.send(exported.data);
    }

    res.setHeader('Content-Type', exported.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${(title || 'informe').replace(/[^\w\-]+/g, '_')}.${exported.extension}"`
    );
    return res.send(exported.data);
  } catch (err) {
    if (err.code === 'RB_DATASET_EXPIRED') {
      return res.status(404).json({ error: err.message, code: err.code });
    }
    console.error('[informe/export]', err);
    return res.status(400).json({ error: err.message || 'No se pudo exportar' });
  }
});

module.exports = router;
