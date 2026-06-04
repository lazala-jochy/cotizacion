import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    setPreview(null);
    setError('');
    setSuccess('');
  }, [period]);

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
        <h2 className="panel-title">607 — Ventas</h2>
        <p className="muted panel-desc">
          La <strong>vista previa</strong> muestra el archivo <strong>TXT</strong> que se exportará, con las
          <strong> facturas emitidas</strong> del período (módulo Facturas).
        </p>

        <DgiiPeriodField year={year} month={month} onYearChange={setYear} onMonthChange={setMonth} />

        <div className="form-actions" style={{ marginTop: '1rem' }}>
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
        <section className="panel quotes-panel dgii-606-preview-panel">
          <h3 className="panel-subtitle">
            Vista previa TXT — {formatDgiiPeriodLabel(preview.period)}
          </h3>
          <p className="muted panel-desc">
            RNC emisor: <code>{preview.emitterRnc || '—'}</code> · Registros:{' '}
            <strong>{preview.recordCount}</strong>
          </p>

          <DgiiTxtPreview
            content={preview.txt}
            emptyMessage="No hay ventas en este período."
          />

          <p className="muted dgii-606-export-hint">
            Totales en el archivo: facturado{' '}
            <strong>{formatMoney(preview.totals?.montoFacturado)}</strong> · ITBIS{' '}
            <strong>{formatMoney(preview.totals?.itbisFacturado)}</strong>
          </p>

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
        </section>
      )}
    </>
  );
}
