const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const reportBuilder = require('../report_builder/ReportBuilder');

const router = express.Router();
router.use(authMiddleware);

const MAX_BYTES = 12 * 1024 * 1024;

router.post('/analyze', (req, res) => {
  try {
    const contentBase64 = req.body?.contentBase64;
    if (!contentBase64) return res.status(400).json({ error: 'Archivo requerido (contentBase64)' });
    const buffer = Buffer.from(contentBase64, 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'Archivo vacío' });
    if (buffer.length > MAX_BYTES) return res.status(400).json({ error: 'Archivo supera 12 MB' });

    const data = reportBuilder.analyzeUpload(
      buffer,
      req.body?.fileName || 'dataset.xlsx',
      req.user?.id
    );
    res.json(data);
  } catch (err) {
    if (err.code === 'RB_EMPTY') return res.status(400).json({ error: err.message, code: err.code });
    console.error('[report_builder/analyze]', err);
    return res.status(400).json({ error: err.message || 'No se pudo analizar el archivo' });
  }
});

router.post('/run', (req, res) => {
  try {
    const { datasetId, config, reportType, selections } = req.body || {};
    if (!datasetId) return res.status(400).json({ error: 'datasetId requerido' });
    const data = reportBuilder.executeReport({
      datasetId,
      userId: req.user?.id,
      config,
      reportType,
      selections,
    });
    res.json(data);
  } catch (err) {
    if (err.code === 'RB_DATASET_EXPIRED') {
      return res.status(404).json({ error: err.message, code: err.code });
    }
    console.error('[report_builder/run]', err);
    return res.status(400).json({ error: err.message || 'No se pudo ejecutar el reporte' });
  }
});

router.post('/export', async (req, res) => {
  try {
    const { datasetId, format, rows, summary, title, filters, query, chartSpec } = req.body || {};
    if (!datasetId) return res.status(400).json({ error: 'datasetId requerido' });
    const exported = await reportBuilder.exportDatasetReport({
      datasetId,
      userId: req.user?.id,
      format: format || 'csv',
      rows: rows || [],
      summary: summary || {},
      title: title || 'Reporte',
      filters: filters || [],
      query,
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
        `attachment; filename="${(title || 'reporte').replace(/[^\w\-]+/g, '_')}.${exported.extension}"`
      );
      return res.send(exported.data);
    }

    res.setHeader('Content-Type', exported.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${(title || 'reporte').replace(/[^\w\-]+/g, '_')}.${exported.extension}"`
    );
    return res.send(exported.data);
  } catch (err) {
    if (err.code === 'RB_DATASET_EXPIRED') {
      return res.status(404).json({ error: err.message, code: err.code });
    }
    console.error('[report_builder/export]', err);
    return res.status(400).json({ error: err.message || 'No se pudo exportar' });
  }
});

module.exports = router;
