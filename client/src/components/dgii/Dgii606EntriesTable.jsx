import { Link } from 'react-router-dom';

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(n || 0);
}

/**
 * Misma estructura que Compras → Gastos (RNC, NCF, descripción, categoría, fecha, monto, ITBIS).
 */
export default function Dgii606EntriesTable({ entries, onDeletePurchase, emptyMessage }) {
  const totalMonto = entries.reduce((s, r) => s + Number(r.monto_total || 0), 0);
  const totalItbis = entries.reduce((s, r) => s + Number(r.itbis_facturado || 0), 0);

  return (
    <div className="table-wrap dgii-606-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>RNC</th>
            <th>NCF</th>
            <th>Descripción</th>
            <th>Categoría</th>
            <th>Fecha</th>
            <th className="num">Monto</th>
            <th className="num">ITBIS</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">
                {emptyMessage}
              </td>
            </tr>
          )}
          {entries.map((row) => (
            <tr key={`${row.source}-${row.id}`}>
              <td>{row.supplier_rnc || '—'}</td>
              <td>{row.ncf ? <code>{row.ncf}</code> : '—'}</td>
              <td>{row.description || '—'}</td>
              <td>{row.category_name || '—'}</td>
              <td>{row.fecha_comprobante}</td>
              <td className="num">{formatMoney(row.monto_total)}</td>
              <td className="num">{formatMoney(row.itbis_facturado)}</td>
              <td>
                {row.expense_id ? (
                  <Link to="/compras/gastos" className="btn-ghost btn-sm" title="Editar en Compras">
                    Compras
                  </Link>
                ) : row.canDelete && onDeletePurchase ? (
                  <button
                    type="button"
                    className="btn-icon-danger btn-sm"
                    onClick={() => onDeletePurchase(row.purchase_id || row.id)}
                    title="Eliminar compra manual"
                  >
                    Eliminar
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {entries.length > 0 && (
          <tfoot>
            <tr className="dgii-606-totals-row">
              <td colSpan={5}>
                <strong>Total ({entries.length} registros)</strong>
                <span className="muted" style={{ display: 'block', fontWeight: 'normal' }}>
                  Monto = total pagado en Compras · ITBIS = valor del gasto o calculado (18 %)
                </span>
              </td>
              <td className="num">
                <strong>{formatMoney(totalMonto)}</strong>
              </td>
              <td className="num">
                <strong>{formatMoney(totalItbis)}</strong>
              </td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
