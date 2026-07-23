/**
 * Rutas para procesar imágenes de facturas con OCR
 * Endpoints para extraer datos de facturas automáticamente
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { extractInvoiceData } = require('../ocr/invoiceOcrExtractor');

router.use(authMiddleware);

/**
 * POST /api/ocr/extract-invoice
 * Procesa una imagen de factura y extrae datos relevantes para el formato 606
 * 
 * Body esperado:
 * {
 *   "image": "data:image/png;base64,...",  // O URL de imagen
 * }
 * 
 * Respuesta:
 * {
 *   "success": true,
 *   "data": {
 *     "rnc": "12345678-1",
 *     "ncf": "E310010000001",
 *     "fecha_comprobante": "2024-01-15",
 *     "monto_base": 1000.00,
 *     "itbis": 180.00,
 *     "descripcion": "Nombre del Proveedor"
 *   }
 * }
 */
router.post('/extract-invoice', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere parámetro "image"',
      });
    }

    const result = await extractInvoiceData(image);

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (err) {
    console.error('Error en OCR extractor:', err);
    res.status(500).json({
      success: false,
      error: 'Error procesando la imagen',
    });
  }
});

module.exports = router;
