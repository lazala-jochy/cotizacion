import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import DgiiPeriodField, { buildPeriod, defaultPeriodParts } from '../../components/dgii/DgiiPeriodField';

export default function DgiiFormat608() {
  const defaults = defaultPeriodParts();
  const [year, setYear] = useState(defaults.year);
  const [month, setMonth] = useState(defaults.month);
  const [reasons, setReasons] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const period = buildPeriod(year, month);

  useEffect(() => {
    api.dgii
      .catalogs()
      .then((c) => setReasons(c.annulmentReasons || []))
      .catch(() => {});
  }, []);

  const reasonLabel = (code) => reasons.find((r) => r.code === code)?.label || code;

  const loadPreview = useCallback(async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await api.dgii.preview608(period);
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
      const result = await api.dgii.export608(period);
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
        <h2 className="panel-title">Comprobantes anulados — Formato 608</h2>

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
          <p className="muted">
            Período: <strong>{preview.period}</strong> · Registros: <strong>{preview.recordCount}</strong>
          </p>

          {preview.errors?.length > 0 && (
            <div className="alert alert-error">
              <ul className="dgii-error-list">
                {preview.errors.map((err, i) => (
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
                  <th>Fecha anulación</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="muted">
                      No hay comprobantes anulados en este período.
                    </td>
                  </tr>
                )}
                {preview.rows?.map((row) => (
                  <tr key={row.invoiceId}>
                    <td>
                      <code>{row.fiscalNumber}</code>
                    </td>
                    <td>{row.cancelledAt}</td>
                    <td>
                      <span className="muted">{row.cancelReason}</span> —{' '}
                      {reasonLabel(row.cancelReason)}
                    </td>
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
