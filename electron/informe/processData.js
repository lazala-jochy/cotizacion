const { readSheetRecords, groupByKeyword, parseAmount } = require('./utils');

function sumColumn(rows, col) {
  return rows.reduce((s, r) => s + parseAmount(r[col]), 0);
}

function filterByKeywords(rows, col, keywords = []) {
  if (!keywords.length) return rows;
  return rows.filter((r) => {
    const val = String(r[col] || '').toUpperCase();
    return keywords.some((k) => val.includes(String(k.keyword || k).toUpperCase()));
  });
}

function buildPreview(filePath, config, sections) {
  const {
    gastosSheet,
    ventasSheet,
    columnMap = {},
  } = config;

  const gastosCol = columnMap.gastos || {};
  const ventasCol = columnMap.ventas || {};

  const gastos = gastosSheet ? readSheetRecords(filePath, gastosSheet) : { records: [] };
  const ventas = ventasSheet ? readSheetRecords(filePath, ventasSheet) : { records: [] };

  const totalGastos = gastosCol.monto ? sumColumn(gastos.records, gastosCol.monto) : 0;
  const totalVentas = ventasCol.total ? sumColumn(ventas.records, ventasCol.total) : 0;

  const result = {
    totalGastos,
    totalVentas,
    sections: {},
  };

  const active = (sections || []).filter((s) => s.active);

  for (const section of active) {
    if (section.id === 'gastos_entidad') {
      const entidades = section.config?.entidades || [];
      const rows = gastosCol.proveedor && gastosCol.monto
        ? groupByKeyword(gastos.records, gastosCol.monto, gastosCol.proveedor, entidades)
        : [];
      const total = rows.reduce((s, r) => s + r.total, 0);
      result.sections.gastos_entidad = { rows, total };
    }

    if (section.id === 'productos_estrella') {
      const productos = section.config?.productos || [];
      const rows = productos.map(({ label, keyword }) => {
        const matched = ventas.records.filter((r) =>
          String(r[ventasCol.producto] || '')
            .toUpperCase()
            .includes(String(keyword || '').toUpperCase())
        );
        const unidades = ventasCol.cantidad
          ? matched.reduce((s, r) => s + parseAmount(r[ventasCol.cantidad]), 0)
          : matched.length;
        const total = ventasCol.total
          ? matched.reduce((s, r) => s + parseAmount(r[ventasCol.total]), 0)
          : 0;
        const pct = totalVentas > 0 ? total / totalVentas : 0;
        return { label, keyword, unidades, total, pct };
      });
      const sumUnidades = rows.reduce((s, r) => s + r.unidades, 0);
      const sumTotal = rows.reduce((s, r) => s + r.total, 0);
      const sumPct = totalVentas > 0 ? sumTotal / totalVentas : 0;
      result.sections.productos_estrella = {
        rows,
        totals: { unidades: sumUnidades, total: sumTotal, pct: sumPct },
      };
    }

    if (section.id === 'ratio_gasto') {
      result.sections.ratio_gasto = {
        totalVentas,
        totalGastos,
        ratio: totalVentas > 0 ? totalGastos / totalVentas : 0,
      };
    }

    if (section.id === 'globalizado') {
      result.sections.globalizado = {
        totalVentas,
        totalGastos,
        resultado: totalVentas - totalGastos,
      };
    }

    if (section.id === 'categoria_compra') {
      const entidades = section.config?.entidades || [];
      const sectionLabel = section.config?.label || section.label;
      const rows = gastosCol.proveedor && gastosCol.monto
        ? groupByKeyword(gastos.records, gastosCol.monto, gastosCol.proveedor, entidades)
        : [];
      const categoryTotal = rows.reduce((s, r) => s + r.total, 0);
      const withPct = rows.map((r) => ({
        ...r,
        pct: categoryTotal > 0 ? r.total / categoryTotal : 0,
      }));
      result.sections.categoria_compra = {
        label: sectionLabel,
        rows: withPct,
        total: categoryTotal,
      };
    }
  }

  return result;
}

module.exports = { buildPreview, sumColumn };
