const ExcelJS = require('exceljs');
const { buildPreview } = require('./processData');

const COLORS = {
  headerMain: 'FF1F4E79',
  sectionTitle: 'FF2E75B6',
  colHeader: 'FF2E75B6',
  rowEven: 'FFFFFFFF',
  rowOdd: 'FFF2F2F2',
  total: 'FFE2EFDA',
  starEven: 'FFFFF2CC',
  starOdd: 'FFFFFFFF',
  polloEven: 'FFFCE4D6',
  polloOdd: 'FFFFFFFF',
  positive: 'FFC6EFCE',
  border: 'FFBFBFBF',
  white: 'FFFFFFFF',
};

const COL_WIDTHS = { A: 38, B: 22, C: 22, D: 16 };

function thinBorder() {
  return {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } },
  };
}

function fillCell(cell, argb, opts = {}) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  cell.border = thinBorder();
  if (opts.font) cell.font = opts.font;
  if (opts.alignment) cell.alignment = opts.alignment;
  if (opts.numFmt) cell.numFmt = opts.numFmt;
}

function setupSheet(ws) {
  ws.getColumn('A').width = COL_WIDTHS.A;
  ws.getColumn('B').width = COL_WIDTHS.B;
  ws.getColumn('C').width = COL_WIDTHS.C;
  ws.getColumn('D').width = COL_WIDTHS.D;
}

function writeMainHeader(ws, row, title) {
  ws.mergeCells(`A${row}:D${row}`);
  const cell = ws.getCell(`A${row}`);
  cell.value = title;
  fillCell(cell, COLORS.headerMain, {
    font: { bold: true, size: 13, color: { argb: COLORS.white } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });
  ws.getRow(row).height = 36;
  return row + 1;
}

function writeSectionTitle(ws, row, title) {
  ws.mergeCells(`A${row}:D${row}`);
  const cell = ws.getCell(`A${row}`);
  cell.value = title;
  fillCell(cell, COLORS.sectionTitle, {
    font: { bold: true, size: 11, color: { argb: COLORS.white } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  });
  ws.getRow(row).height = 22;
  return row + 1;
}

function writeColHeaders(ws, row, headers) {
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    fillCell(cell, COLORS.colHeader, {
      font: { bold: true, size: 10, color: { argb: COLORS.white } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
  });
  return row + 1;
}

function writeDataRow(ws, row, values, { alt = false, palette = 'default', formats = [] }) {
  const palettes = {
    default: [COLORS.rowEven, COLORS.rowOdd],
    star: [COLORS.starEven, COLORS.starOdd],
    pollo: [COLORS.polloEven, COLORS.polloOdd],
  };
  const [even, odd] = palettes[palette] || palettes.default;
  const bg = alt ? odd : even;

  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = v;
    const fmt = formats[i];
    const align =
      fmt === 'money' || fmt === 'qty'
        ? { horizontal: 'right', vertical: 'middle' }
        : fmt === 'pct'
          ? { horizontal: 'center', vertical: 'middle' }
          : { horizontal: 'left', vertical: 'middle' };
    fillCell(cell, bg, {
      font: { size: 10 },
      alignment: align,
      numFmt:
        fmt === 'money' ? '#,##0.00' : fmt === 'qty' ? '#,##0' : fmt === 'pct' ? '0.0%' : undefined,
    });
  });
  return row + 1;
}

function writeTotalRow(ws, row, values, formats = []) {
  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = v;
    const fmt = formats[i];
    fillCell(cell, COLORS.total, {
      font: { bold: true, size: 10 },
      alignment: {
        horizontal: fmt === 'money' || fmt === 'qty' ? 'right' : fmt === 'pct' ? 'center' : 'left',
        vertical: 'middle',
      },
      numFmt:
        fmt === 'money' ? '#,##0.00' : fmt === 'qty' ? '#,##0' : fmt === 'pct' ? '0.0%' : undefined,
    });
  });
  return row + 1;
}

function blankRow(ws, row) {
  return row + 1;
}

async function generateReportExcel({ filePath, outputPath, config, sections, title }) {
  const preview = buildPreview(filePath, config, sections);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Informe');
  setupSheet(ws);

  let row = 1;
  row = writeMainHeader(ws, row, title || 'INFORME FINANCIERO');
  row = blankRow(ws, row);

  const active = (sections || []).filter((s) => s.active).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const section of active) {
    const data = preview.sections[section.id];
    if (!data) continue;

    if (section.id === 'gastos_entidad') {
      row = writeSectionTitle(ws, row, section.label || 'Gastos por Entidad');
      row = writeColHeaders(ws, row, ['Entidad', 'Monto RD$', '', '']);
      data.rows.forEach((r, i) => {
        row = writeDataRow(ws, row, [r.label, r.total, '', ''], {
          alt: i % 2 === 1,
          formats: ['text', 'money', null, null],
        });
      });
      row = writeTotalRow(ws, row, ['TOTAL', data.total, '', ''], ['text', 'money', null, null]);
      row = blankRow(ws, row);
    }

    if (section.id === 'productos_estrella') {
      row = writeSectionTitle(ws, row, section.label || 'Productos Estrella');
      row = writeColHeaders(ws, row, ['Producto', 'Unidades', 'Total RD$', '% Ventas']);
      data.rows.forEach((r, i) => {
        row = writeDataRow(ws, row, [r.label, r.unidades, r.total, r.pct], {
          alt: i % 2 === 1,
          palette: 'star',
          formats: ['text', 'qty', 'money', 'pct'],
        });
      });
      row = writeTotalRow(
        ws,
        row,
        ['SUMATORIA', data.totals.unidades, data.totals.total, data.totals.pct],
        ['text', 'qty', 'money', 'pct']
      );
      row = blankRow(ws, row);
    }

    if (section.id === 'ratio_gasto') {
      row = writeSectionTitle(ws, row, section.label || 'Gasto Inventario / Ventas');
      row = writeColHeaders(ws, row, ['Concepto', 'Valor', '', '']);
      row = writeDataRow(ws, row, ['Total Ventas', data.totalVentas, '', ''], {
        formats: ['text', 'money', null, null],
      });
      row = writeDataRow(ws, row, ['Total Gastos', data.totalGastos, '', ''], {
        alt: true,
        formats: ['text', 'money', null, null],
      });
      row = writeTotalRow(ws, row, ['Ratio Gasto/Ventas', data.ratio, '', ''], [
        'text',
        'pct',
        null,
        null,
      ]);
      row = blankRow(ws, row);
    }

    if (section.id === 'globalizado') {
      row = writeSectionTitle(ws, row, section.label || 'Total Globalizado');
      row = writeColHeaders(ws, row, ['Concepto', 'Monto RD$', '', '']);
      row = writeDataRow(ws, row, ['Total Ventas', data.totalVentas, '', ''], {
        formats: ['text', 'money', null, null],
      });
      row = writeDataRow(ws, row, ['Total Gastos', data.totalGastos, '', ''], {
        alt: true,
        formats: ['text', 'money', null, null],
      });
      const resultBg = data.resultado >= 0 ? COLORS.positive : COLORS.total;
      const resultCell = ws.getCell(row, 1);
      ws.getCell(row, 1).value = 'Resultado (Ventas − Gastos)';
      ws.getCell(row, 2).value = data.resultado;
      [1, 2].forEach((c) => {
        const cell = ws.getCell(row, c);
        fillCell(cell, resultBg, {
          font: { bold: true, size: 10 },
          alignment: { horizontal: c === 2 ? 'right' : 'left', vertical: 'middle' },
          numFmt: c === 2 ? '#,##0.00' : undefined,
        });
      });
      row += 1;
      row = blankRow(ws, row);
    }

    if (section.id === 'categoria_compra') {
      row = writeSectionTitle(ws, row, data.label || section.label);
      row = writeColHeaders(ws, row, ['Proveedor', 'Monto RD$', '% Categoría', '']);
      data.rows.forEach((r, i) => {
        row = writeDataRow(ws, row, [r.label, r.total, r.pct, ''], {
          alt: i % 2 === 1,
          palette: 'pollo',
          formats: ['text', 'money', 'pct', null],
        });
      });
      row = writeTotalRow(ws, row, ['TOTAL', data.total, 1, ''], ['text', 'money', 'pct', null]);
      row = blankRow(ws, row);
    }
  }

  await wb.xlsx.writeFile(outputPath);
  return { outputPath };
}

module.exports = { generateReportExcel };
