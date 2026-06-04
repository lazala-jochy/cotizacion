import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import DgiiPeriodField, { buildPeriod, defaultPeriodParts } from '../../components/dgii/DgiiPeriodField';
import DgiiTxtPreview from '../../components/dgii/DgiiTxtPreview';
import { formatDgiiPeriodLabel } from '../../utils/dgiiPeriod';

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(n || 0);
}

function formatPreviewError(err) {
  if (err.expenseId) return `Gasto #${err.expenseId}: ${err.error}`;
  if (err.purchaseId) return `Compra manual #${err.purchaseId}: ${err.error}`;
  return err.error;
}

export default function DgiiFormat606() {
  const defaults = defaultPeriodParts();
  const [year, setYear] = useState(defaults.year);
  const [month, setMonth] = useState(defaults.month);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const period = buildPeriod(year, month);

  useEffect(() => {
    setPreview(null);
    setError('');
    setSuccess('');
  }, [period]);

  const loadPreview = async () => {
    if (!period) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await api.dgii.preview606(period);
      setPreview(data);
    } catch (e) {
      setPreview(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setError('');
    setSuccess('');
    setExporting(true);
    try {
      const result = await api.dgii.export606(period);
      setPreview(result.preview);
      if (result.report?.id) {
        await api.dgii.downloadReport(result.report.id, result.filename);
      }
      setSuccess(`Archivo descargado: ${result.filename}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <section className="panel">
        <h2 className="panel-title">Compras — Formato 606</h2>
        <p className="muted panel-desc">
          La <strong>vista previa</strong> muestra el archivo <strong>TXT</strong> que se exportará, con los
          gastos de <strong>Compras</strong> del período que tengan RNC y NCF. Use{' '}
          <Link to="/compras/gastos">Compras → Gastos</Link> para registrar o completar cada gasto.
        </p>

        <DgiiPeriodField year={year} month={month} onYearChange={setYear} onMonthChange={setMonth} />

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <Link to="/compras/gastos" className="btn-ghost">
            + Agregar compra
          </Link>
          <button type="button" className="btn-primary" onClick={loadPreview} disabled={loading || !period}>
            {loading ? 'Generando TXT…' : 'Vista previa'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleExport}
            disabled={exporting || loading || !period}
          >
            {exporting ? 'Exportando…' : 'Exportar TXT'}
          </button>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {!preview && !loading && period && (
        <p className="muted">
          Seleccione el período y pulse <strong>Vista previa</strong> para ver el contenido del TXT.
        </p>
      )}

      {preview && (
        <>
          <section className="panel quotes-panel dgii-606-preview-panel">
            <h3 className="panel-subtitle">
              Vista previa TXT — {formatDgiiPeriodLabel(preview.period)}
            </h3>
            <p className="muted panel-desc">
              RNC emisor: <code>{preview.emitterRnc || '—'}</code> · Registros:{' '}
              <strong>{preview.recordCount}</strong>
              {preview.expenseCount > 0 && (
                <>
                  {' '}
                  · {preview.expenseCount} gasto(s) de Compras
                  {preview.purchaseCount > 0 ? `, ${preview.purchaseCount} manual(es) antiguo(s)` : ''}
                </>
              )}
            </p>

            <DgiiTxtPreview
              content={preview.txt}
              emptyMessage="No hay gastos con RNC y NCF en este período. Regístrelos en Compras y vuelva a cargar la vista previa."
            />

            <p className="muted dgii-606-export-hint">
              Totales en el archivo: base gravable{' '}
              <strong>{formatMoney(preview.totals?.montoFacturado)}</strong> + ITBIS{' '}
              <strong>{formatMoney(preview.totals?.itbisFacturado)}</strong> ={' '}
              <strong>{formatMoney(preview.totals?.montoTotal)}</strong> pagado
            </p>

            {preview.pendingExpenses > 0 && (
              <div className="alert alert-error">
                <strong>
                  {preview.pendingExpenses} gasto(s) en Compras sin RNC o NCF
                </strong>{' '}
                — no se incluyen en el 606. Complételos en{' '}
                <Link to="/compras/gastos">Compras → Gastos</Link>.
                {preview.pendingExpenseRows?.length > 0 && (
                  <ul className="dgii-error-list" style={{ marginTop: '0.5rem' }}>
                    {preview.pendingExpenseRows.slice(0, 10).map((g) => (
                      <li key={g.id}>
                        #{g.id} {g.expense_date} — {g.description}
                        {!g.rnc?.trim() && ' (falta RNC)'}
                        {!g.ncf?.trim() && ' (falta NCF)'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {preview.errors?.length > 0 && (
              <div className="alert alert-error">
                <strong>Errores de validación ({preview.errors.length})</strong>
                <ul className="dgii-error-list">
                  {preview.errors.map((err, i) => (
                    <li key={i}>{formatPreviewError(err)}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
