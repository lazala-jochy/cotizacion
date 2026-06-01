import { useCallback, useState } from 'react';
import { api } from '../../api';
import DgiiPeriodField, { buildPeriod, defaultPeriodParts } from '../../components/dgii/DgiiPeriodField';

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(n || 0);
}

export default function DgiiFormat607() {
  const defaults = defaultPeriodParts();
  const [year, setYear] = useState(defaults.year);
  const [month, setMonth] = useState(defaults.month);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const period = buildPeriod(year, month);

  const loadPreview = useCallback(async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await api.dgii.preview607(period);
      setPreview(data);
    } catch (e) {
      setPreview(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  const handleExport = async () => {
    setError('');
    setSuccess('');
    setExporting(true);
    try {
      const result = await api.dgii.export607(period);
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
        <h2 className="panel-title">Ventas — Formato 607</h2>

        <DgiiPeriodField year={year} month={month} onYearChange={setYear} onMonthChange={setMonth} />

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn-primary" onClick={loadPreview} disabled={loading || !period}>
            {loading ? 'Cargando…' : 'Vista previa'}
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

      {preview && (
        <section className="panel quotes-panel">
          <div className="quotes-toolbar">
            <p className="muted">
              RNC emisor: <strong>{preview.emitterRnc || '—'}</strong> · Período:{' '}
              <strong>{preview.period}</strong> · Registros: <strong>{preview.recordCount}</strong>
            </p>
            <p className="muted">
              Total facturado: {formatMoney(preview.totals?.montoFacturado)} · ITBIS:{' '}
              {formatMoney(preview.totals?.itbisFacturado)}
            </p>
          </div>

          {preview.errors?.length > 0 && (
            <div className="alert alert-error">
              <strong>Errores de validación ({preview.errors.length})</strong>
              <ul className="dgii-error-list">
                {preview.errors.slice(0, 15).map((err, i) => (
                  <li key={i}>
                    {err.fiscalNumber && <code>{err.fiscalNumber}</code>} {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>NCF</th>
                  <th>Cliente</th>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th className="num">Monto</th>
                  <th className="num">ITBIS</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      No hay ventas en este período.
                    </td>
                  </tr>
                )}
                {preview.rows?.map((row) => (
                  <tr key={row.invoiceId}>
                    <td>
                      <code>{row.fiscalNumber}</code>
                    </td>
                    <td>{row.clientNombre}</td>
                    <td>
                      <span className="muted">{row.idType}</span> {row.idValue}
                    </td>
                    <td>{row.fechaComprobante}</td>
                    <td className="num">{formatMoney(row.montoFacturado)}</td>
                    <td className="num">{formatMoney(row.itbisFacturado)}</td>
                    <td className="num">{formatMoney(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
