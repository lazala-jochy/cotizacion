const db = require('../db');
const fiscalRangeRepo = require('./fiscalRangeRepository');
const invoiceRepo = require('./invoiceRepository');
const auditRepo = require('./invoiceAuditRepository');
const { calcTotals } = require('./invoiceTotals');
const { parseFiscalNumber } = require('./fiscalNumber');
const {
  formatFiscalNumber,
  validateFiscalRangeForIssue,
  validateActiveRangeBase,
  validateSecuenciaInRange,
} = require('./fiscalValidation');

const MAX_ALLOC_RETRIES = 8;

class InvoiceError extends Error {
  constructor(message, code = 'INVOICE_ERROR') {
    super(message);
    this.code = code;
  }
}

function getUserNombre(userId) {
  const row = db.prepare('SELECT nombre FROM users WHERE id = ?').get(userId);
  return row?.nombre || 'Usuario';
}

/**
 * Asigna el siguiente número fiscal con bloqueo optimista (transacción + reintento).
 */
function allocateFiscalNumber(userId) {
  for (let attempt = 0; attempt < MAX_ALLOC_RETRIES; attempt += 1) {
    try {
      const result = db.transaction(() => {
        const range = fiscalRangeRepo.getActiveRange(userId);
        const check = validateFiscalRangeForIssue(range);
        if (!check.ok) throw new InvoiceError(check.error, 'FISCAL_RANGE');

        const nextSecuencia = check.nextSecuencia;
        const fiscalNumber = formatFiscalNumber(range.serie, nextSecuencia);

        const dup = db
          .prepare('SELECT id FROM invoices WHERE user_id = ? AND fiscal_number = ?')
          .get(userId, fiscalNumber);
        if (dup) {
          throw new InvoiceError(
            `El número fiscal ${fiscalNumber} ya existe. Operación cancelada.`,
            'DUPLICATE_FISCAL'
          );
        }

        const updated = db
          .prepare(
            `UPDATE fiscal_ranges SET ultimo_numero_utilizado = ?, updated_at = datetime('now')
             WHERE id = ? AND user_id = ? AND ultimo_numero_utilizado = ?`
          )
          .run(nextSecuencia, range.id, userId, range.ultimo_numero_utilizado);

        if (updated.changes === 0) {
          throw new InvoiceError('CONFLICT', 'CONFLICT');
        }

        return { range, nextSecuencia, fiscalNumber };
      })();
      return result;
    } catch (err) {
      if (err.code === 'CONFLICT' && attempt < MAX_ALLOC_RETRIES - 1) continue;
      if (err instanceof InvoiceError) throw err;
      throw err;
    }
  }
  throw new InvoiceError(
    'No se pudo asignar un número fiscal. Intente de nuevo.',
    'CONFLICT'
  );
}

function syncRangeUltimoIfHigher(userId, rangeId, secuencia) {
  const range = fiscalRangeRepo.getById(rangeId, userId);
  if (!range) return;
  if (secuencia > range.ultimo_numero_utilizado) {
    db.prepare(
      `UPDATE fiscal_ranges SET ultimo_numero_utilizado = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(secuencia, rangeId, userId);
  }
}

function resolveCustomFiscalNumber(userId, fiscalNumberInput, options = {}) {
  const range = fiscalRangeRepo.getActiveRange(userId);
  const base = validateActiveRangeBase(range);
  if (!base.ok) throw new InvoiceError(base.error, 'FISCAL_RANGE');

  const parsed = parseFiscalNumber(fiscalNumberInput, range.serie);
  if (!parsed) {
    throw new InvoiceError(
      'Número fiscal inválido. Use el formato serie + secuencia, por ejemplo B02000000126.',
      'INVALID_FISCAL'
    );
  }

  const inRange = validateSecuenciaInRange(range, parsed.secuencia);
  if (!inRange.ok) throw new InvoiceError(inRange.error, 'FISCAL_RANGE');

  if (
    invoiceRepo.fiscalNumberExists(userId, parsed.fiscal_number, options.excludeInvoiceId ?? null)
  ) {
    throw new InvoiceError(
      `El número fiscal ${parsed.fiscal_number} ya existe. Operación cancelada.`,
      'DUPLICATE_FISCAL'
    );
  }

  return {
    range,
    nextSecuencia: parsed.secuencia,
    fiscalNumber: parsed.fiscal_number,
    serie: parsed.serie,
    custom: true,
  };
}

function resolveFiscalAllocation(userId, overrides = {}, options = {}) {
  const manual = overrides.fiscal_number?.trim();
  if (manual) {
    return resolveCustomFiscalNumber(userId, manual, options);
  }
  return allocateFiscalNumber(userId);
}

function previewNextFiscalNumber(userId) {
  const range = fiscalRangeRepo.getActiveRange(userId);
  const check = validateFiscalRangeForIssue(range);
  if (!check.ok) {
    throw new InvoiceError(check.error, 'FISCAL_RANGE');
  }
  return {
    fiscal_number: formatFiscalNumber(range.serie, check.nextSecuencia),
    serie: range.serie,
    secuencia: check.nextSecuencia,
  };
}

function mapQuoteToInvoicePayload(quote, fiscalAllocation, overrides = {}) {
  const applyItbis = Number(quote.itbis) > 0 || Number(quote.itbis_rate) > 0;
  const items = quote.items || [];
  const totals = calcTotals(
    items,
    applyItbis,
    Boolean(quote.itbis_manual),
    quote.itbis_rate,
    overrides.descuento ?? quote.descuento ?? 0
  );

  const fechaEmision = overrides.fecha_emision || new Date().toISOString().slice(0, 10);
  let fechaVencimiento = overrides.fecha_vencimiento;
  if (fechaVencimiento === undefined && quote.validez_dias) {
    const d = new Date(`${fechaEmision}T12:00:00`);
    d.setDate(d.getDate() + Number(quote.validez_dias));
    fechaVencimiento = d.toISOString().slice(0, 10);
  }

  return {
    user_id: quote.user_id,
    quote_id: quote.id,
    fiscal_range_id: fiscalAllocation.range.id,
    numero: invoiceRepo.nextInternalNumber(quote.user_id),
    fiscal_number: fiscalAllocation.fiscalNumber,
    serie: fiscalAllocation.serie || fiscalAllocation.range.serie,
    secuencia: fiscalAllocation.nextSecuencia,
    fecha_emision: fechaEmision,
    fecha_vencimiento: fechaVencimiento ?? null,
    estado: overrides.estado || 'pendiente',
    client_nombre: quote.client_nombre,
    client_rnc: quote.client_rnc,
    client_direccion: quote.client_direccion,
    client_telefono: quote.client_telefono,
    client_email: quote.client_email,
    ...totals,
    notas: quote.notas,
    ejecutivo: quote.ejecutivo,
    forma_pago: quote.forma_pago,
    monto_pagado: 0,
    items: items.map((item, idx) => ({
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      total: item.total,
      orden: idx,
    })),
  };
}

function convertQuoteToInvoice(quote, userId, userNombre, overrides = {}) {
  if (!quote?.items?.length) {
    throw new InvoiceError('La cotización no tiene ítems para facturar.');
  }

  const existing = invoiceRepo.getByQuoteId(quote.id, userId);
  if (existing && existing.estado !== 'anulada') {
    throw new InvoiceError(
      `Esta cotización ya tiene la factura ${existing.fiscal_number}.`,
      'ALREADY_CONVERTED'
    );
  }

  const fiscalAllocation = resolveFiscalAllocation(userId, overrides);
  const payload = mapQuoteToInvoicePayload({ ...quote, user_id: userId }, fiscalAllocation, overrides);

  let invoiceId;
  try {
    invoiceId = invoiceRepo.insertInvoiceWithItems(payload, payload.items);
    syncRangeUltimoIfHigher(userId, fiscalAllocation.range.id, fiscalAllocation.nextSecuencia);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw new InvoiceError(
        'El número de factura ya existe. Operación cancelada.',
        'DUPLICATE_FISCAL'
      );
    }
    throw err;
  }

  const nombre = userNombre || getUserNombre(userId);
  auditRepo.log(invoiceId, userId, nombre, 'creada', {
    origen: 'cotizacion',
    quote_id: quote.id,
    quote_numero: quote.numero,
    fiscal_number: payload.fiscal_number,
  });

  return invoiceRepo.getById(invoiceId, userId);
}

function createManualInvoice(userId, userNombre, body) {
  if (!body.items?.length) {
    throw new InvoiceError('Agregue al menos un ítem a la factura.');
  }

  const applyItbis = body.apply_itbis !== false;
  const totals = calcTotals(
    body.items,
    applyItbis,
    Boolean(body.itbis_manual),
    body.itbis_rate,
    body.descuento ?? 0
  );

  const fiscalAllocation = resolveFiscalAllocation(userId, body);
  const payload = {
    user_id: userId,
    quote_id: null,
    fiscal_range_id: fiscalAllocation.range.id,
    numero: invoiceRepo.nextInternalNumber(userId),
    fiscal_number: fiscalAllocation.fiscalNumber,
    serie: fiscalAllocation.serie || fiscalAllocation.range.serie,
    secuencia: fiscalAllocation.nextSecuencia,
    fecha_emision: body.fecha_emision || new Date().toISOString().slice(0, 10),
    fecha_vencimiento: body.fecha_vencimiento || null,
    estado: body.estado || 'pendiente',
    client_nombre: body.client_nombre?.trim(),
    client_rnc: body.client_rnc?.trim() || null,
    client_direccion: body.client_direccion?.trim() || null,
    client_telefono: body.client_telefono?.trim() || null,
    client_email: body.client_email?.trim() || null,
    ...totals,
    notas: body.notas?.trim() || null,
    ejecutivo: body.ejecutivo?.trim() || null,
    forma_pago: body.forma_pago?.trim() || null,
    monto_pagado: Number(body.monto_pagado) || 0,
    items: body.items,
  };

  let invoiceId;
  try {
    invoiceId = invoiceRepo.insertInvoiceWithItems(payload, body.items);
    syncRangeUltimoIfHigher(userId, fiscalAllocation.range.id, fiscalAllocation.nextSecuencia);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw new InvoiceError('El número de factura ya existe. Operación cancelada.', 'DUPLICATE_FISCAL');
    }
    throw err;
  }

  auditRepo.log(invoiceId, userId, userNombre || getUserNombre(userId), 'creada', {
    origen: 'manual',
    fiscal_number: payload.fiscal_number,
  });

  return invoiceRepo.getById(invoiceId, userId);
}

function updateInvoice(id, userId, userNombre, body) {
  const existing = invoiceRepo.getById(id, userId);
  if (!existing) return null;
  if (existing.estado === 'anulada') {
    throw new InvoiceError('No se puede editar una factura anulada.');
  }

  const applyItbis = body.apply_itbis !== false;
  const totals = calcTotals(
    body.items,
    applyItbis,
    Boolean(body.itbis_manual),
    body.itbis_rate,
    body.descuento ?? existing.descuento
  );

  const patch = {
    fecha_emision: body.fecha_emision || existing.fecha_emision,
    fecha_vencimiento: body.fecha_vencimiento ?? existing.fecha_vencimiento,
    estado: body.estado || existing.estado,
    client_nombre: body.client_nombre?.trim(),
    client_rnc: body.client_rnc?.trim() || null,
    client_direccion: body.client_direccion?.trim() || null,
    client_telefono: body.client_telefono?.trim() || null,
    client_email: body.client_email?.trim() || null,
    ...totals,
    notas: body.notas?.trim() || null,
    ejecutivo: body.ejecutivo?.trim() || null,
    forma_pago: body.forma_pago?.trim() || null,
    monto_pagado: body.monto_pagado ?? existing.monto_pagado,
  };

  if (body.fiscal_number != null && String(body.fiscal_number).trim()) {
    const parsed = resolveCustomFiscalNumber(userId, String(body.fiscal_number).trim(), {
      excludeInvoiceId: id,
    });
    if (
      parsed.fiscalNumber !== existing.fiscal_number ||
      parsed.serie !== existing.serie ||
      parsed.nextSecuencia !== existing.secuencia
    ) {
      patch.fiscal_number = parsed.fiscalNumber;
      patch.serie = parsed.serie;
      patch.secuencia = parsed.nextSecuencia;
      syncRangeUltimoIfHigher(userId, existing.fiscal_range_id, parsed.nextSecuencia);
    }
  }

  const updated = invoiceRepo.updateInvoiceWithItems(id, userId, patch, body.items);
  const nombre = userNombre || getUserNombre(userId);
  const auditDetails = {
    fiscal_number: patch.fiscal_number || existing.fiscal_number,
  };
  if (patch.fiscal_number && patch.fiscal_number !== existing.fiscal_number) {
    auditDetails.fiscal_number_anterior = existing.fiscal_number;
  }
  auditRepo.log(id, userId, nombre, 'editada', auditDetails);
  if (patch.estado === 'pagada' && existing.estado !== 'pagada') {
    auditRepo.log(id, userId, nombre, 'pagada', { fiscal_number: existing.fiscal_number });
  }
  return updated;
}

function annulInvoice(id, userId, userNombre, reason) {
  const existing = invoiceRepo.getById(id, userId);
  if (!existing) return null;
  if (existing.estado === 'anulada') {
    throw new InvoiceError('La factura ya está anulada.');
  }

  db.prepare(
    `UPDATE invoices SET estado = 'anulada', updated_at = datetime('now') WHERE id = ? AND user_id = ?`
  ).run(id, userId);

  auditRepo.log(id, userId, userNombre || getUserNombre(userId), 'anulada', {
    motivo: reason || null,
    fiscal_number: existing.fiscal_number,
  });

  return invoiceRepo.getById(id, userId);
}

module.exports = {
  InvoiceError,
  allocateFiscalNumber,
  previewNextFiscalNumber,
  resolveCustomFiscalNumber,
  convertQuoteToInvoice,
  createManualInvoice,
  updateInvoice,
  annulInvoice,
  getUserNombre,
};
