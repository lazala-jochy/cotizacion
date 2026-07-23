/**
 * Servicio para extraer datos de facturas desde imágenes usando OCR.
 * Extrae información relevante para el formato 606 (Compras).
 * 
 * Campos extraídos:
 * - RNC del proveedor (9 u 11 dígitos)
 * - NCF (Número de Comprobante Fiscal)
 * - Fecha del comprobante
 * - Monto base gravable
 * - ITBIS (18%)
 * - Descripción/Nombre del proveedor
 */

const Tesseract = require('tesseract.js');
const { validateRnc } = require('../dgii/utils/validateRnc');
const { validateCedula } = require('../dgii/utils/validateCedula');

/**
 * Busca en todo el texto números que sean un RNC (9 dígitos) o cédula (11 dígitos)
 * matemáticamente válidos (dígito verificador), sin depender de que la etiqueta
 * "RNC" se haya leído bien por OCR. Prioriza números con formato de separadores
 * (más confiables) sobre corridas de dígitos sueltas, y conserva el orden de
 * aparición en el texto (el emisor suele imprimirse antes que el receptor).
 * @param {string} text
 * @returns {string|null}
 */
function findValidTaxId(text) {
  const candidates = [];

  const separated = /(\d{3}[-\s]\d{5}[-\s]\d{1}|\d{3}[-\s]\d{7}[-\s]\d{1})/g;
  let m;
  while ((m = separated.exec(text))) {
    candidates.push(m[1].replace(/[\s-]/g, ''));
  }

  const bare = /(?<!\d)(\d{9}|\d{11})(?!\d)/g;
  while ((m = bare.exec(text))) {
    candidates.push(m[1]);
  }

  for (const cand of candidates) {
    if (cand.length === 9 && validateRnc(cand).ok) return cand;
    if (cand.length === 11 && validateCedula(cand).ok) return cand;
  }
  return null;
}

/**
 * Extrae RNC de texto usando patrones comunes de facturas dominicanas
 * @param {string} text - Texto OCR extraído
 * @returns {string|null}
 */
function extractRNC(text) {
  if (!text || text.trim().length === 0) return null;

  // Limpiar el texto
  const cleanText = text.replace(/[\n\r\t]/g, ' ');

  // RNC dominicano = 9 dígitos (empresa); cédula = 11 dígitos (persona física)
  const rncPatterns = [
    /RNC\s*[\:\-]?\s*(\d{3}[-\s]?\d{5}[-\s]?\d{1})/i,           // 402-34567-8 o 402 34567 8 (9 dígitos)
    /RNC\s*[\:\-]?\s*(\d{9})/i,                                 // RNC: 9 dígitos seguidos
    /RNC\s*[\:\-]?\s*(\d{3}[-\s]?\d{7}[-\s]?\d{1})/i,          // 001-1234567-8 (cédula, 11 dígitos)
    /RNC\s*[\:\-]?\s*(\d{11})/i,                                // 11 dígitos directo (cédula)
    /EMISOR[:\s]+[^\n]{0,40}?(\d{3}[-\s]?\d{5}[-\s]?\d{1})/i,  // Después de "EMISOR" (ventana corta para no cruzar al NCF)
    /(\d{3}[-\s]\d{5}[-\s]\d{1})/,                              // Patrón simple XXX-XXXXX-X
  ];

  // 1) Etiquetas legibles + dígito verificador válido (más confiable)
  for (const pattern of rncPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const rnc = match[1].replace(/[\s\-]/g, '');
      if (rnc.length === 9 && validateRnc(rnc).ok) return rnc;
      if (rnc.length === 11 && validateCedula(rnc).ok) return rnc;
    }
  }

  // 2) Sin depender de la etiqueta: cualquier número válido por checksum en el texto
  //    (cubre el caso en que el OCR no reconoció bien la palabra "RNC")
  const validAnywhere = findValidTaxId(cleanText);
  if (validAnywhere) return validAnywhere;

  // 3) Último recurso: la etiqueta se leyó pero el checksum no valida (posible
  //    error de un solo dígito del OCR) — devolver igual para no perder el dato.
  for (const pattern of rncPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const rnc = match[1].replace(/[\s\-]/g, '');
      if (/^\d{9}$|^\d{11}$/.test(rnc)) return rnc;
    }
  }

  return null;
}

/**
 * Extrae NCF de texto usando patrones de facturas dominicanas
 * @param {string} text - Texto OCR extraído
 * @returns {string|null}
 */
function extractNCF(text) {
  if (!text || text.trim().length === 0) return null;
  
  const cleanText = text.replace(/[\n\r\t]/g, ' ');
  
  // Patrones para NCF: letra + 12 dígitos (ej: B010000123, E310010000001)
  const ncfPatterns = [
    /NCF\s*[\:\-]?\s*([A-Z]\d{11,12})/i,                        // NCF: B010000123
    /NCF\s*[\:\-]?\s*([A-Z][0-9]+)/i,                           // NCF: seguido de letra y números
    /N\.?C\.?F\.?\s*[\:\-]?\s*([A-Z]\d{11,12})/i,              // N.C.F: o N.C.F.
    /NÚMERO\s+DE\s+COMPROBANTE\s*[\:\-]?\s*([A-Z]\d{11,12})/i, // Número de Comprobante
    /([A-Z]\d{11,12})(?=\s|$|[^\w])/,                           // Patrón directo: letra + 11-12 dígitos
  ];

  for (const pattern of ncfPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const ncf = match[1].trim().toUpperCase();
      // Validación básica: debe empezar con letra y tener 12-13 caracteres
      if (/^[A-Z]\d{11,12}$/.test(ncf)) {
        return ncf;
      }
    }
  }
  
  return null;
}

/**
 * Extrae montos (base e ITBIS) del texto
 * @param {string} text - Texto OCR extraído
 * @returns {{base: number|null, itbis: number|null}}
 */
function extractAmounts(text) {
  const result = { base: null, itbis: null };
  if (!text || text.trim().length === 0) return result;

  // Buscar líneas con palabras clave de subtotal/total
  const lines = text.split('\n');

  for (const line of lines) {
    // Buscar SUBTOTAL/Base gravable - prioridad alta
    if (/SUBTOTAL|SUBOTAL|BASE\s*GRAVABLE|MONTO\s*FACTURADO/i.test(line)) {
      // Buscar número después de etiqueta o al final de línea
      const amounts = line.match(/(\d+[\.,]\d{2,3})/g) || [];
      if (amounts.length > 0) {
        const amount = parseFloat(amounts[amounts.length - 1].replace(',', '.'));
        if (amount > 0 && result.base === null) {
          result.base = amount;
        }
      }
    }

    // Buscar ITBIS o impuesto
    if (/ITBIS|ISC|IMPUESTO.*18%/i.test(line)) {
      const amounts = line.match(/(\d+[\.,]\d{2,3})/g) || [];
      if (amounts.length > 0) {
        const amount = parseFloat(amounts[amounts.length - 1].replace(',', '.'));
        if (amount > 0 && result.itbis === null) {
          result.itbis = amount;
        }
      }
    }

    // Buscar TOTAL - solo si no tenemos otros datos
    if (/^TOTAL|TOTAL\s+A\s+PAGAR|TOTAL\s+GENERAL/i.test(line) && !result.base) {
      const amounts = line.match(/(\d+[\.,]\d{2,3})/g) || [];
      if (amounts.length > 0) {
        const total = parseFloat(amounts[amounts.length - 1].replace(',', '.'));
        if (total > 0 && result.itbis) {
          result.base = total - result.itbis;
        }
      }
    }
  }

  return result;
}

/**
 * Extrae fecha en formato YYYY-MM-DD
 * @param {string} text - Texto OCR extraído
 * @returns {string|null}
 */
function extractDate(text) {
  // Buscar fechas en diversos formatos comunes en facturas dominicanas
  // Primero buscar formato YYYY-MM-DD (más específico)
  const yyyymmddMatch = text.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (yyyymmddMatch) {
    try {
      let year = parseInt(yyyymmddMatch[1], 10);
      let month = parseInt(yyyymmddMatch[2], 10);
      let day = parseInt(yyyymmddMatch[3], 10);

      if (day > 0 && day <= 31 && month > 0 && month <= 12 && year >= 2000 && year <= 2100) {
        const date = new Date(year, month - 1, day);
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Continuar
    }
  }

  // Luego buscar formato DD/MM/YYYY o DD-MM-YYYY
  const ddmmyyPatterns = [
    /FECHA\s*[\:\-]?\s*(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/i,
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/,
  ];

  for (const pattern of ddmmyyPatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let day = parseInt(match[1], 10);
        let month = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);

        // Ajustar año si es de 2 dígitos
        if (year < 100) {
          year = year > 50 ? 1900 + year : 2000 + year;
        }

        // Validar que sea una fecha válida
        if (day > 0 && day <= 31 && month > 0 && month <= 12) {
          const date = new Date(year, month - 1, day);
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Continuar con el siguiente patrón
      }
    }
  }

  return null;
}

/**
 * Extrae el nombre/razón social del proveedor
 * @param {string} text - Texto OCR extraído
 * @returns {string|null}
 */
function extractSupplierName(text) {
  // Buscar líneas que contengan "Emisor", "Proveedor", "Razón Social", etc.
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Buscar etiqueta de emisor/proveedor
    if (/EMIS|PROVEE|RAZON SOCIAL|NOMBRE|EMPRESA/i.test(line)) {
      // El nombre probablemente está en esta línea o la siguiente
      let name = line.replace(/EMIS[ORA]*:|PROVEE[DOR]*:|RAZON SOCIAL:|NOMBRE:|EMPRESA:/i, '').trim();
      
      if (!name && i + 1 < lines.length) {
        name = lines[i + 1].trim();
      }

      if (name && name.length > 2 && name.length < 200) {
        return name;
      }
    }
  }

  // Si no encontramos con las etiquetas, usar la primera línea que no sea vacía
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 200 && !/^\d+/.test(trimmed)) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Procesa una imagen de factura y extrae datos relevantes
 * @param {Buffer|string} imageData - Datos de imagen (buffer o URL)
 * @returns {Promise<{success: boolean, data: object, error: string|null}>}
 */
async function extractInvoiceData(imageData) {
  try {
    // Realizar OCR
    const {
      data: { text },
    } = await Tesseract.recognize(imageData, 'spa');

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        data: null,
        error: 'No se pudo extraer texto de la imagen. Asegúrese de que la imagen sea legible.',
      };
    }

    // Log para debugging (eliminar en producción si es necesario)
    console.log('[OCR] Texto extraído de imagen:', text.substring(0, 200));

    // Extraer datos específicos
    let rnc = extractRNC(text);
    let ncf = extractNCF(text);
    const amounts = extractAmounts(text);
    const date = extractDate(text);
    const supplier = extractSupplierName(text);

    console.log('[OCR] Datos extraídos:', { rnc, ncf, amounts, date, supplier });

    // Validación mínima - ser más flexible
    if (!rnc || !ncf) {
      // Intentar una búsqueda más agresiva como último recurso para lo que falte
      console.log('[OCR] Faltan campos con patrones normales. Buscando alternativamente...');

      if (!rnc) {
        const fallbackRnc =
          text.match(/(\d{3}[-\s]\d{5}[-\s]\d{1})/)?.[1]?.replace(/[\s-]/g, '') ||
          text.match(/(?<!\d)(\d{9}|\d{11})(?!\d)/)?.[1];
        if (fallbackRnc) {
          console.log('[OCR] RNC encontrado en búsqueda alternativa:', fallbackRnc);
          rnc = fallbackRnc;
        }
      }
      if (!ncf) {
        const fallbackNcf = text.match(/([A-Z]\d{11,12})/)?.[1];
        if (fallbackNcf) {
          console.log('[OCR] NCF encontrado en búsqueda alternativa:', fallbackNcf);
          ncf = fallbackNcf;
        }
      }

      if (!rnc && !ncf) {
        return {
          success: false,
          data: null,
          error: 'No se encontraron RNC ni NCF en la factura. Verifique que la imagen sea clara y contenga estos campos claramente.',
        };
      }
    }

    // Calcular ITBIS automático si falta
    let itbis = amounts.itbis;
    let base = amounts.base;

    if (base && !itbis) {
      itbis = base * 0.18;
    } else if (itbis && !base) {
      // Si tenemos ITBIS pero no base, calcular base asumiendo 18%
      base = itbis / 0.18;
    }

    const result = {
      success: true,
      data: {
        rnc: rnc || null,
        ncf: ncf || null,
        fecha_comprobante: date || new Date().toISOString().split('T')[0],
        monto_base: base || null,
        itbis: itbis || null,
        descripcion: supplier || null,
        raw_text: text.substring(0, 500), // Guardar primeros 500 caracteres para referencia
      },
      error: null,
    };

    console.log('[OCR] Resultado final:', result);
    return result;
  } catch (err) {
    console.error('[OCR] Error:', err);
    return {
      success: false,
      data: null,
      error: `Error procesando imagen: ${err.message}`,
    };
  }
}

module.exports = {
  extractInvoiceData,
  extractRNC,
  extractNCF,
  extractAmounts,
  extractDate,
  extractSupplierName,
};
