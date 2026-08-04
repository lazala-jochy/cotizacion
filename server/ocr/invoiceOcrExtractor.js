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
 * Recorta el texto hasta la primera coincidencia de cualquiera de los patrones
 * dados (o el texto completo si ninguno aparece).
 * @param {string} text
 * @param {RegExp[]} patterns
 * @returns {string}
 */
function sliceBeforeFirstMatch(text, patterns) {
  let boundaryIndex = -1;
  for (const p of patterns) {
    const m = text.match(p);
    if (m && (boundaryIndex === -1 || m.index < boundaryIndex)) boundaryIndex = m.index;
  }
  return boundaryIndex === -1 ? text : text.slice(0, boundaryIndex);
}

/**
 * En una factura/recibo dominicano, los datos del EMISOR (proveedor: nombre,
 * dirección, teléfono, RNC) siempre se imprimen antes del e-NCF y de los
 * datos del COMPRADOR ("NUMERO FACTURA", nombre y RNC del cliente). Acotar la
 * búsqueda a esta zona evita capturar por error el RNC del comprador (nuestra
 * propia empresa), que aparece más abajo en el documento.
 * @param {string} cleanText
 * @returns {string}
 */
function findEmitterZone(cleanText) {
  return sliceBeforeFirstMatch(cleanText, [
    /e[\s-]*NCF/i,
    /\bN\.?\s*C\.?\s*F\.?\s*[\:\-]/i,
    /N[UÚ]MERO\s+(DE\s+)?FACTURA/i,
  ]);
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
  // Solo el bloque del emisor: nunca se debe devolver el RNC del comprador.
  const emitterZone = findEmitterZone(cleanText);

  // RNC dominicano = 9 dígitos (empresa); cédula = 11 dígitos (persona física)
  const rncPatterns = [
    /RNC\s*[\:\-]?\s*(\d{3}[-\s]?\d{5}[-\s]?\d{1})/i,           // 402-34567-8 o 402 34567 8 (9 dígitos)
    /RNC\s*[\:\-]?\s*(\d{9})/i,                                 // RNC: 9 dígitos seguidos
    /RNC\s*[\:\-]?\s*(\d{3}[-\s]?\d{7}[-\s]?\d{1})/i,          // 001-1234567-8 (cédula, 11 dígitos)
    /RNC\s*[\:\-]?\s*(\d{11})/i,                                // 11 dígitos directo (cédula)
    /EMISOR[:\s]+[^\n]{0,40}?(\d{3}[-\s]?\d{5}[-\s]?\d{1})/i,  // Después de "EMISOR" (ventana corta para no cruzar al NCF)
    /(\d{3}[-\s]\d{5}[-\s]\d{1})/,                              // Patrón simple XXX-XXXXX-X
  ];

  // 1) Etiquetas legibles + dígito verificador válido, dentro de la zona del emisor
  for (const pattern of rncPatterns) {
    const match = emitterZone.match(pattern);
    if (match && match[1]) {
      const rnc = match[1].replace(/[\s\-]/g, '');
      if (rnc.length === 9 && validateRnc(rnc).ok) return rnc;
      if (rnc.length === 11 && validateCedula(rnc).ok) return rnc;
    }
  }

  // 2) Sin depender de la etiqueta: cualquier número válido por checksum, pero
  //    solo dentro de la zona del emisor (cubre el caso en que el OCR no
  //    reconoció bien la palabra "RNC" del proveedor).
  const validInEmitterZone = findValidTaxId(emitterZone);
  if (validInEmitterZone) return validInEmitterZone;

  // 3) Último recurso: la etiqueta se leyó pero el checksum no valida (posible
  //    error de un solo dígito del OCR) — devolver igual para no perder el dato,
  //    siempre restringido a la zona del emisor.
  for (const pattern of rncPatterns) {
    const match = emitterZone.match(pattern);
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
  // El e-NCF se imprime en el bloque del emisor, antes de "NUMERO FACTURA"
  // (dato interno que ya pertenece a la sección del comprador).
  const searchZone = sliceBeforeFirstMatch(cleanText, [/N[UÚ]MERO\s+(DE\s+)?FACTURA/i]);

  // Patrones para NCF: letra + 12 dígitos (ej: B010000123, E310010000001).
  // A diferencia del RNC, el NCF no tiene dígito verificador: no hay manera de
  // confirmar matemáticamente si un valor "adivinado" es correcto. Por eso
  // todos los patrones exigen una etiqueta (NCF, e-NCF, N.C.F, Número de
  // Comprobante) — nunca se acepta un simple "letra + 11-12 dígitos" suelto en
  // el texto, porque una letra de OCR extra/mal leída junto al NCF real
  // (ej. "e-NCF: E310000001572" leído como "ES109006801572") haría que ese
  // patrón devuelva un NCF distinto y con apariencia válida, pero incorrecto.
  const ncfPatterns = [
    /NCF\s*[\:\-]?\s*([A-Z]\d{11,12})/i,                        // NCF: B010000123
    /NCF\s*[\:\-]?\s*([A-Z][0-9]+)/i,                           // NCF: seguido de letra y números
    /N\.?C\.?F\.?\s*[\:\-]?\s*([A-Z]\d{11,12})/i,              // N.C.F: o N.C.F.
    /NÚMERO\s+DE\s+COMPROBANTE\s*[\:\-]?\s*([A-Z]\d{11,12})/i, // Número de Comprobante
  ];

  for (const pattern of ncfPatterns) {
    const match = searchZone.match(pattern);
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
 * Normaliza un número con formato dominicano/latino ("1,100.00", "932,20",
 * "1.100,00") a un float estándar, decidiendo cuál separador es el decimal.
 * @param {string} str
 * @returns {number}
 */
function parseLocaleAmount(str) {
  let s = str.trim();
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // Ambos presentes: el que aparece más a la derecha es el decimal.
    s = lastDot > lastComma ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  } else if (lastComma > -1) {
    // Solo coma: decimal si deja exactamente 2 dígitos detrás, si no es separador de miles.
    const decimals = s.length - lastComma - 1;
    s = decimals === 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  }
  return parseFloat(s);
}

/**
 * Devuelve el último monto (con separadores de miles/decimales) que aparece
 * en una línea, o null si no hay ninguno.
 * @param {string} line
 * @returns {number|null}
 */
function lastAmountInLine(line) {
  const matches = line.match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d+[.,]\d{2,3}/g) || [];
  if (matches.length === 0) return null;
  const amount = parseLocaleAmount(matches[matches.length - 1]);
  return Number.isFinite(amount) ? amount : null;
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
  let total = null;

  for (const line of lines) {
    // Buscar SUBTOTAL/Base gravable - prioridad alta. "SUB\s*TOTA" (sin exigir
    // la "L" final) tolera errores comunes de OCR como "SUBTOTA!" o "SUBOTA".
    if (/SUB\s*TOTA|BASE\s*GRAVABLE|MONTO\s*FACTURADO/i.test(line)) {
      const amount = lastAmountInLine(line);
      if (amount !== null && amount > 0 && result.base === null) {
        result.base = amount;
      }
    }

    // Buscar ITBIS o impuesto. Muchos recibos solo imprimen "IMPUESTOS: x.xx"
    // sin el "18%" ni la palabra "ITBIS" exacta, así que no se exige ese sufijo.
    if (/ITBIS|ISC|IMPUESTO/i.test(line)) {
      const amount = lastAmountInLine(line);
      if (amount !== null && amount > 0 && result.itbis === null) {
        result.itbis = amount;
      }
    }

    // Buscar TOTAL facturado/a pagar (se usa después del loop para completar
    // lo que falte, sin depender de que ITBIS ya se haya encontrado).
    if (/^TOTAL|TOTAL\s+A\s+PAGAR|TOTAL\s+GENERAL|TOTAL\s+FACTURAD/i.test(line)) {
      const amount = lastAmountInLine(line);
      if (amount !== null && amount > 0 && total === null) {
        total = amount;
      }
    }
  }

  // Completar base/ITBIS a partir del total cuando falte alguno de los dos.
  if (total !== null) {
    if (result.base !== null && result.itbis === null) {
      result.itbis = Math.round((total - result.base) * 100) / 100;
    } else if (result.itbis !== null && result.base === null) {
      result.base = Math.round((total - result.itbis) * 100) / 100;
    } else if (result.base === null && result.itbis === null) {
      // Sin SUBTOTAL ni ITBIS legibles: asumir ITBIS 18% incluido en el total.
      result.base = Math.round((total / 1.18) * 100) / 100;
      result.itbis = Math.round((total - result.base) * 100) / 100;
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
 * Indica si una línea "parece" el nombre impreso del negocio: mayormente en
 * mayúsculas (como suelen imprimirse las razones sociales en estos recibos),
 * a diferencia de artefactos de OCR de baja calidad (logos, ruido) que suelen
 * salir en minúsculas o con mayúsculas/minúsculas mezcladas al azar.
 * @param {string} line
 * @returns {boolean}
 */
function looksLikePrintedHeaderLine(line) {
  const letters = line.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  if (letters.length < 4) return false;
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, '');
  return upper.length / letters.length >= 0.7;
}

/**
 * Extrae el nombre/razón social del proveedor
 * @param {string} text - Texto OCR extraído
 * @returns {string|null}
 */
function extractSupplierName(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  // Buscar, entre las primeras líneas, la primera que "parezca" un nombre de
  // negocio impreso (mayormente mayúsculas). Esto evita quedarse con ruido de
  // OCR (ej. artefactos de un logo) que a veces aparece antes del nombre real.
  const headerCandidate = lines
    .slice(0, 8)
    .find((l) => l.length > 4 && l.length < 200 && looksLikePrintedHeaderLine(l));
  if (headerCandidate) return headerCandidate;

  // En los recibos/facturas dominicanos, la primera línea no vacía es casi
  // siempre la razón social del proveedor impresa en el encabezado.
  const first = lines[0];
  if (first.length > 2 && first.length < 200 && !/^\d+$/.test(first)) {
    return first;
  }

  // Respaldo: buscar etiqueta explícita de emisor/proveedor. Se usan límites
  // de palabra (\b) para no confundir "EMISOR" con "EMISIÓN" (fecha de emisión).
  const labelPattern = /\bEMISOR\b|\bPROVEEDOR\b|\bRAZ[OÓ]N\s+SOCIAL\b|\bEMPRESA\b/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (labelPattern.test(line)) {
      let name = line.replace(/\b(EMISOR|PROVEEDOR|RAZ[OÓ]N\s+SOCIAL|EMPRESA)\b\s*[\:\-]?/i, '').trim();

      if (!name && i + 1 < lines.length) {
        name = lines[i + 1];
      }

      if (name && name.length > 2 && name.length < 200) {
        return name;
      }
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

      // Igual que en extractRNC: nunca buscar fuera de la zona del emisor, o
      // esta búsqueda "agresiva" acabaría devolviendo el RNC del comprador
      // (nuestra propia empresa) en vez del proveedor. El NCF no tiene un
      // respaldo equivalente: al no tener dígito verificador, "adivinar" un
      // valor con forma válida pero sin etiqueta reconocible es más peligroso
      // que dejarlo en blanco para que el usuario lo confirme a mano.
      const cleanText = text.replace(/[\n\r\t]/g, ' ');
      const emitterZone = findEmitterZone(cleanText);

      if (!rnc) {
        const fallbackRnc =
          emitterZone.match(/(\d{3}[-\s]\d{5}[-\s]\d{1})/)?.[1]?.replace(/[\s-]/g, '') ||
          emitterZone.match(/(?<!\d)(\d{9}|\d{11})(?!\d)/)?.[1];
        if (fallbackRnc) {
          console.log('[OCR] RNC encontrado en búsqueda alternativa:', fallbackRnc);
          rnc = fallbackRnc;
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
        // Si no se pudo leer la fecha del comprobante, se deja en null: sustituirla
        // por la fecha de hoy metería el gasto en el período fiscal equivocado sin
        // que nadie lo note. Mejor forzar que el usuario la confirme a mano.
        fecha_comprobante: date || null,
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
