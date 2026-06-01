/** Cálculos de rentabilidad (cotización, factura, estado de resultados). */

function sumProductCost(items) {
  return (items || []).reduce(
    (s, i) => s + Number(i.cantidad || 0) * Number(i.costo_unitario || 0),
    0
  );
}

function sumExpenses(expenses) {
  return (expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
}

/**
 * Rentabilidad de una cotización o factura.
 * @param {object} doc - quote/invoice con subtotal, descuento, itbis, total
 * @param {object[]} items - líneas con costo_unitario
 * @param {object[]} expenses - gastos vinculados
 */
function computeDocumentProfitability(doc, items, expenses) {
  const subtotal = Number(doc.subtotal) || 0;
  const descuento = Number(doc.descuento) || 0;
  const itbis = Number(doc.itbis) || 0;
  const total = Number(doc.total) || 0;
  const revenue = Math.max(0, subtotal - descuento);
  const productCost = sumProductCost(items);
  const expensesTotal = sumExpenses(expenses);
  const grossProfit = revenue - productCost;
  const netProfit = revenue - productCost - expensesTotal;
  const marginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    subtotal,
    descuento,
    itbis,
    total,
    revenue,
    productCost,
    expensesTotal,
    grossProfit,
    netProfit,
    marginPercent,
  };
}

module.exports = {
  sumProductCost,
  sumExpenses,
  computeDocumentProfitability,
};
