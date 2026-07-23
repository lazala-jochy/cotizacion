/**
 * Descarga el PDF de pre-factura generado en el servidor.
 * @param {number|string} quoteId
 * @param {string} quoteNumero
 * @param {{ includeSignature?: boolean }} [opts]
 */
export async function downloadInvoicePdf(quoteId, quoteNumero, opts = {}) {
  const { includeSignature = true } = opts;
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/quotes/${quoteId}/pdf?incluirFirma=${includeSignature ? '1' : '0'}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'No se pudo descargar el PDF');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const safeName = String(quoteNumero || quoteId).replace(/[^\w.-]+/g, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `Cotizacion-${safeName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
