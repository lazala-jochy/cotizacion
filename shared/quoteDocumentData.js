function isZero(n) {
  return Math.abs(Number(n) || 0) < 0.005;
}

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(Number(n) || 0);
}

function lineItemTotal(item) {
  const cantidad = Number(item.cantidad) || 0;
  const precio = Number(item.precio_unitario) || 0;
  if (item.total != null && item.total !== '') return Number(item.total) || 0;
  return Math.round(cantidad * precio * 100) / 100;
}

function filterQuoteItems(items) {
  return (items || []).filter((item) => {
    const cantidad = Number(item.cantidad) || 0;
    const precio = Number(item.precio_unitario) || 0;
    const total = lineItemTotal(item);
    const hasText = Boolean(String(item.descripcion || '').trim());
    return hasText || !isZero(cantidad) || !isZero(precio) || !isZero(total);
  });
}

function itbisPercent(quote) {
  if (quote.itbis_rate != null) return Number(quote.itbis_rate);
  if (quote.subtotal > 0 && quote.itbis > 0) {
    return Math.round((quote.itbis / quote.subtotal) * 10000) / 100;
  }
  return 18;
}

function buildTotalsRows(quote) {
  const rows = [];
  const subtotal = Number(quote.subtotal) || 0;
  const itbis = Number(quote.itbis) || 0;

  if (!isZero(subtotal)) {
    rows.push({ label: 'Subtotal', value: subtotal });
  }

  if (itbis > 0) {
    if (!isZero(subtotal)) {
      rows.push({ label: 'Subtotal gravado', value: subtotal });
    }
    rows.push({
      label: `ITBIS (${itbisPercent(quote)}%)`,
      value: itbis,
    });
  } else if (!isZero(subtotal)) {
    rows.push({ label: 'Subtotal exento', value: subtotal });
  }

  rows.push({ label: 'Total cotización', value: Number(quote.total) || 0, grand: true });

  const montoPagado = Number(quote.monto_pagado) || 0;
  if (!isZero(montoPagado)) {
    rows.push({ label: 'Monto pagado', value: montoPagado });
  }

  return rows;
}

function getDocumentTerms(quote, ejecutivoFallback = '') {
  const dias = Number(quote.validez_dias) || 30;
  const ejecutivo =
    String(quote.ejecutivo || '').trim() || String(ejecutivoFallback || '').trim() || '—';
  return {
    ejecutivo,
    condiciones: `Válida por ${dias} día${dias === 1 ? '' : 's'}`,
    formaPago: String(quote.forma_pago || '').trim() || 'Efectivo / Transferencia',
  };
}

module.exports = {
  isZero,
  formatMoney,
  lineItemTotal,
  filterQuoteItems,
  itbisPercent,
  buildTotalsRows,
  getDocumentTerms,
};
