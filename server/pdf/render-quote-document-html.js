const { ESTADO_LABELS, normalizeEstado } = require('../quoteWorkflow');
const {
  formatMoney,
  filterQuoteItems,
  lineItemTotal,
  buildTotalsRows,
  getDocumentTerms,
} = require('../../shared/quoteDocumentData');
const documentStyles = require('./quote-document-styles');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function partyLines({ nombre, rnc, direccion, telefono, email, emisorName }) {
  const lines = [];
  if (nombre) {
    lines.push(`<p class="quote-party-name">${escapeHtml(nombre)}</p>`);
  }
  if (rnc) {
    lines.push(
      `<p class="quote-party-line"><span class="quote-party-label">RNC:</span> ${escapeHtml(rnc)}</p>`
    );
  }
  if (direccion) {
    lines.push(
      `<p class="quote-party-line"><span class="quote-party-label">Dirección:</span> ${escapeHtml(direccion)}</p>`
    );
  }
  if (telefono) {
    lines.push(
      `<p class="quote-party-line"><span class="quote-party-label">Tel.:</span> ${escapeHtml(telefono)}</p>`
    );
  }
  if (email) {
    lines.push(
      `<p class="quote-party-line"><span class="quote-party-label">Email:</span> ${escapeHtml(email)}</p>`
    );
  }
  if (!lines.length && emisorName) {
    lines.push(`<p class="quote-party-name">${escapeHtml(emisorName)}</p>`);
  }
  return lines.join('');
}

function renderQuoteDocumentHtml({ quote, emisor }) {
  const items = filterQuoteItems(quote.items);
  const totals = buildTotalsRows(quote);
  const terms = getDocumentTerms(quote);
  const estadoLabel = ESTADO_LABELS[normalizeEstado(quote.estado)] || quote.estado;
  const emisorNombre = emisor?.nombre?.trim() || '— Sin configurar —';
  const logo = emisor?.logo?.startsWith('data:image') ? emisor.logo : '';

  const itemsHtml = items
    .map((item, index) => {
      const total = lineItemTotal(item);
      return `<tr>
        <td class="num">${index + 1}</td>
        <td class="num">${escapeHtml(item.cantidad)}</td>
        <td>${escapeHtml(item.descripcion)}</td>
        <td class="num">${escapeHtml(formatMoney(item.precio_unitario))}</td>
        <td class="num">${escapeHtml(formatMoney(total))}</td>
      </tr>`;
    })
    .join('');

  const totalsHtml = totals
    .map((row) => {
      const classes = ['row', row.grand ? 'grand-total' : ''].filter(Boolean).join(' ');
      return `<div class="${classes}"><span>${escapeHtml(row.label)}</span><span>${escapeHtml(formatMoney(row.value))}</span></div>`;
    })
    .join('');

  const paymentsHtml =
    quote.payments?.length > 0 ?
      `<section class="quote-payments-doc">
        <h3>Historial de pagos</h3>
        <table class="quote-items-doc">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Método</th>
              <th>Referencia</th>
              <th class="num">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${quote.payments
              .map(
                (p) => `<tr>
              <td>${escapeHtml(p.fecha || '—')}</td>
              <td>${escapeHtml(p.metodo || '—')}</td>
              <td>${escapeHtml(p.referencia || '—')}</td>
              <td class="num">${escapeHtml(formatMoney(p.monto))}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </section>`
    : '';

  const notesHtml =
    quote.notas?.trim() ?
      `<section class="quote-notes">
        <h3>Notas</h3>
        <p>${escapeHtml(quote.notas).replace(/\r?\n/g, '<br>')}</p>
      </section>`
    : '';

  const footerHtml =
    emisor?.nombre?.trim() ?
      `<footer class="quote-doc-footer"><p>Gracias por su preferencia — ${escapeHtml(emisor.nombre)}</p></footer>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Cotización ${escapeHtml(quote.numero)}</title>
  <style>${documentStyles}</style>
</head>
<body>
  <article class="quote-document">
    <header class="quote-doc-header">
      <div class="quote-emisor-info quote-emisor-info--stacked">
        ${logo ? `<img src="${logo}" alt="" class="quote-emisor-logo" />` : ''}
        <div class="quote-party-info">
          ${partyLines({
            nombre: emisorNombre,
            rnc: emisor?.rnc,
            direccion: emisor?.direccion,
            telefono: emisor?.telefono,
            email: emisor?.email,
          })}
        </div>
      </div>
      <div class="quote-doc-meta">
        <h2>COTIZACIÓN</h2>
        <p><strong>No.</strong> ${escapeHtml(quote.numero)}</p>
        <p><strong>Fecha:</strong> ${escapeHtml(quote.fecha)}</p>
        <p><strong>Válida por:</strong> ${escapeHtml(quote.validez_dias ?? 30)} días</p>
        <p><strong>Estado:</strong> ${escapeHtml(estadoLabel)}</p>
      </div>
    </header>

    <section class="quote-client-block">
      <h3>Cliente</h3>
      <div class="quote-party-info">
        ${partyLines({
          nombre: quote.client_nombre,
          rnc: quote.client_rnc,
          direccion: quote.client_direccion,
          telefono: quote.client_telefono,
          email: quote.client_email,
        })}
      </div>
    </section>

    <table class="quote-items-doc">
      <thead>
        <tr>
          <th class="num">Item</th>
          <th class="num">Cantidad</th>
          <th>Descripción</th>
          <th class="num">Precio unitario</th>
          <th class="num">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || '<tr><td colspan="5">Sin ítems</td></tr>'}
      </tbody>
    </table>

    <div class="quote-doc-bottom">
      <div class="quote-doc-terms">
        <p><span class="quote-doc-terms-label">Ejecutivo:</span> ${escapeHtml(terms.ejecutivo)}</p>
        <p><span class="quote-doc-terms-label">Condiciones:</span> ${escapeHtml(terms.condiciones)}</p>
        <p><span class="quote-doc-terms-label">Forma de pago:</span> ${escapeHtml(terms.formaPago)}</p>
      </div>
      <div class="quote-doc-totals">${totalsHtml}</div>
    </div>

    ${paymentsHtml}
    ${notesHtml}
    ${footerHtml}
  </article>
</body>
</html>`;
}

module.exports = { renderQuoteDocumentHtml, escapeHtml };
