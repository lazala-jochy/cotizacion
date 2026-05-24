const PDFDocument = require('pdfkit');
const { ESTADO_LABELS, normalizeEstado } = require('../quoteWorkflow');

function formatRD(amount) {
  const n = Number(amount) || 0;
  return `RD$${n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatQty(n) {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function itbisPercent(quote) {
  if (quote.itbis_rate != null) return Number(quote.itbis_rate);
  if (quote.subtotal > 0 && quote.itbis > 0) {
    return Math.round((quote.itbis / quote.subtotal) * 10000) / 100;
  }
  return 18;
}

function drawLine(doc, y, x1 = 50, x2 = 562) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
}

function tryDrawLogo(doc, logo, x, y) {
  if (!logo || !logo.startsWith('data:image')) return 0;
  try {
    const base64 = logo.includes(',') ? logo.split(',')[1] : logo;
    const buf = Buffer.from(base64, 'base64');
    doc.image(buf, x, y, { width: 56, height: 56, fit: [56, 56] });
    return 64;
  } catch {
    return 0;
  }
}

/**
 * Genera PDF estilo pre-factura / comprobante fiscal (referencia RIZEK CACAO SAS).
 */
function generateInvoicePdf({ quote, emisor }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width - 100;
    const rightX = 50 + pageW;
    let y = 50;

    const logoH = tryDrawLogo(doc, emisor?.logo, 50, y);
    const textX = logoH > 0 ? 120 : 50;

    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000');
    doc.text(emisor?.nombre || 'Empresa', textX, y, { width: 280 });

    doc.font('Helvetica').fontSize(9);
    let hy = y + 18;
    if (emisor?.rnc) {
      doc.text(`RNC: ${emisor.rnc}`, textX, hy);
      hy += 12;
    }
    if (emisor?.direccion) {
      doc.text(`Dirección: ${emisor.direccion}`, textX, hy, { width: 280 });
      hy += 12;
    }
    if (emisor?.telefono) {
      doc.text(`Tel.: ${emisor.telefono}`, textX, hy);
      hy += 12;
    }
    if (emisor?.email) {
      doc.text(`Email: ${emisor.email}`, textX, hy);
      hy += 12;
    }
    doc.text('Régimen: Régimen general', textX, hy);

    const boxW = 200;
    const boxX = rightX - boxW;
    doc.font('Helvetica-Bold').fontSize(12).text('Pre-factura', boxX, y, { width: boxW, align: 'right' });
    doc.font('Helvetica').fontSize(8);
    doc.text('Tipo comprobante (e-CF): 31 · Factura de Crédito Fiscal', boxX, y + 16, {
      width: boxW,
      align: 'right',
    });
    doc.font('Helvetica-Bold').fontSize(9).text('Con valor fiscal', boxX, y + 32, {
      width: boxW,
      align: 'right',
    });
    const estadoLabel = ESTADO_LABELS[normalizeEstado(quote.estado)] || quote.estado;
    doc.font('Helvetica').fontSize(9);
    doc.text(`Estado: ${estadoLabel}`, boxX, y + 48, { width: boxW, align: 'right' });

    y = Math.max(hy + 20, y + 70);
    drawLine(doc, y);
    y += 14;

    doc.font('Helvetica-Bold').fontSize(10).text('CLIENTE', 50, y);
    y += 14;
    doc.font('Helvetica-Bold').fontSize(10).text(quote.client_nombre || '—', 50, y);
    y += 12;
    doc.font('Helvetica').fontSize(9);
    if (quote.client_rnc) {
      doc.text(`RNC: ${quote.client_rnc}`, 50, y);
      y += 11;
    }
    if (quote.client_direccion) {
      doc.text(`Dirección: ${quote.client_direccion}`, 50, y, { width: pageW });
      y += 11;
    }
    if (quote.client_telefono) {
      doc.text(`Tel.: ${quote.client_telefono}`, 50, y);
      y += 11;
    }
    if (quote.client_email) {
      doc.text(`Email: ${quote.client_email}`, 50, y);
      y += 11;
    }
    y += 7;

    const colConcept = 50;
    const colCant = 380;
    const colValor = 470;
    const tableRight = 562;

    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('CONCEPTO', colConcept, y);
    doc.text('CANT', colCant, y, { width: 80, align: 'right' });
    doc.text('VALOR', colValor, y, { width: tableRight - colValor, align: 'right' });
    y += 10;
    drawLine(doc, y);
    y += 6;
    doc.font('Helvetica-Bold').fontSize(8).text('SERVICIO', colConcept, y);
    y += 12;

    doc.font('Helvetica').fontSize(9);
    const items = quote.items || [];
    for (const item of items) {
      const lineTotal = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0);
      const descH = doc.heightOfString(item.descripcion || '—', { width: 310 });
      doc.text(item.descripcion || '—', colConcept, y, { width: 310 });
      doc.text(formatQty(item.cantidad), colCant, y, { width: 80, align: 'right' });
      doc.text(formatRD(lineTotal), colValor, y, { width: tableRight - colValor, align: 'right' });
      y += Math.max(descH, 14) + 4;
      if (y > 680) {
        doc.addPage();
        y = 50;
      }
    }

    y += 8;
    drawLine(doc, y);
    y += 12;

    const gravado = quote.itbis > 0 ? quote.subtotal : 0;
    const exento = quote.itbis > 0 ? 0 : quote.subtotal;
    const totalQty = items.reduce((s, i) => s + (Number(i.cantidad) || 0), 0);

    const totalsX = 340;
    const totalsW = tableRight - totalsX;
    const row = (label, value, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      doc.text(label, totalsX, y, { width: 120 });
      doc.text(value, totalsX + 120, y, { width: totalsW - 120, align: 'right' });
      y += 14;
    };

    row('Subtotal:', formatRD(quote.subtotal));
    row('Subtotal Exento:', formatRD(exento));
    row('Subtotal Gravado:', formatRD(gravado));
    row(`ITBIS${quote.itbis > 0 ? ` (${itbisPercent(quote)}%)` : ''}:`, formatRD(quote.itbis));
    y += 2;
    row('Total cotización:', formatRD(quote.total), true);

    const montoPagado = roundMoney(quote.monto_pagado || 0);
    const balancePendiente = roundMoney(
      quote.balance_pendiente != null ? quote.balance_pendiente : quote.total - montoPagado
    );
    y += 4;
    row('Estado:', estadoLabel);
    row('Monto pagado:', formatRD(montoPagado));
    row('Balance pendiente:', formatRD(balancePendiente), true);

    const payments = quote.payments || [];
    if (payments.length > 0) {
      y += 14;
      doc.font('Helvetica-Bold').fontSize(9).text('Historial de pagos', 50, y);
      y += 12;
      const payColFecha = 50;
      const payColMet = 120;
      const payColRef = 220;
      const payColMonto = 460;
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('Fecha', payColFecha, y);
      doc.text('Método', payColMet, y);
      doc.text('Referencia', payColRef, y);
      doc.text('Monto', payColMonto, y, { width: 100, align: 'right' });
      y += 12;
      drawLine(doc, y);
      y += 6;
      doc.font('Helvetica').fontSize(8);
      for (const p of payments) {
        doc.text(p.fecha || '—', payColFecha, y);
        doc.text(p.metodo || '—', payColMet, y, { width: 90 });
        doc.text(p.referencia || '—', payColRef, y, { width: 230 });
        doc.text(formatRD(p.monto), payColMonto, y, { width: 100, align: 'right' });
        y += 14;
        if (y > 680) {
          doc.addPage();
          y = 50;
        }
      }
    }

    y += 16;
    doc.font('Helvetica').fontSize(9);
    const condiciones = quote.notas?.trim() || `Válida por ${quote.validez_dias || 30} días`;
    doc.text(`Condiciones: ${condiciones}`, 50, y, { width: pageW });
    y += 12;
    doc.text('Forma de pago: Efectivo', 50, y);
    y += 12;
    doc.text(`Ejecutivo: ${emisor?.nombre || '—'}`, 50, y);
    y += 12;
    doc.text(`Total de líneas: ${items.length}`, 50, y);
    y += 12;
    doc.text(`Total de productos: ${formatQty(totalQty)}`, 50, y);
    y += 20;
    doc.fillColor('#666666').fontSize(8);
    doc.text('Generado en sistema de facturación', 50, y);
    y += 10;
    doc.text(`Comprobante: ${quote.numero}`, 50, y);
    doc.text(`Fecha: ${quote.fecha}`, 50, y + 10);

    doc.end();
  });
}

module.exports = { generateInvoicePdf, formatRD };
