const PDFDocument = require('pdfkit');

function formatRD(amount) {
  const n = Number(amount) || 0;
  return `RD$${n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatQty(n) {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
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
      doc.text(emisor.direccion, textX, hy, { width: 280 });
      hy += 12;
    }
    const contact = [
      emisor?.telefono ? `Tel: ${emisor.telefono}` : null,
      emisor?.email ? `Email: ${emisor.email}` : null,
    ]
      .filter(Boolean)
      .join('  ');
    if (contact) {
      doc.text(contact, textX, hy, { width: 300 });
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

    y = Math.max(hy + 20, y + 70);
    drawLine(doc, y);
    y += 14;

    doc.font('Helvetica-Bold').fontSize(10).text('CLIENTE', 50, y);
    y += 14;
    doc.font('Helvetica-Bold').fontSize(10).text(quote.client_nombre || '—', 50, y);
    y += 12;
    doc.font('Helvetica').fontSize(9);
    doc.text(`RNC/Cédula: ${quote.client_rnc || '—'}`, 50, y);
    y += 11;
    doc.text(`Tel: ${quote.client_telefono || '—'}`, 50, y);
    y += 11;
    doc.text(`Email: ${quote.client_email || '—'}`, 50, y);
    y += 18;

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
    row('Total:', formatRD(quote.total), true);

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
