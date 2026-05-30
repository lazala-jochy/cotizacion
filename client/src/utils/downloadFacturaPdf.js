export async function downloadFacturaPdf(invoiceId, fiscalNumber) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'No se pudo descargar el PDF');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const safeName = String(fiscalNumber || invoiceId).replace(/[^\w.-]+/g, '_');
  const a = document.createElement('a');
  a.href = url;
  a.download = `Factura-${safeName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
