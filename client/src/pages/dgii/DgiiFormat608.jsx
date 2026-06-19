import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import DgiiPeriodField, { buildPeriod, defaultPeriodParts } from '../../components/dgii/DgiiPeriodField';
import DgiiTxtPreview from '../../components/dgii/DgiiTxtPreview';
import { formatDgiiPeriodLabel } from '../../utils/dgiiPeriod';
import { SectionLoader } from '../../components/loading';
import LoadingOverlay from '../../components/LoadingOverlay';

export default function DgiiFormat608() {
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
      <LoadingOverlay show={exporting} fixed message="Exportando TXT…" />
      <section className="panel">
        <h2 className="panel-title">Comprobantes anulados — Formato 608</h2>
        <p className="muted panel-desc">
          La <strong>vista previa</strong> muestra el archivo <strong>TXT</strong> que se exportará, con las
          <strong> facturas anuladas</strong> del período (módulo Facturas).
        </p>

        <DgiiPeriodField year={year} month={month} onYearChange={setYear} onMonthChange={setMonth} />

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn-primary" onClick={loadPreview} disabled={loading || !period}>
            Vista previa
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleExport}
            disabled={exporting || loading || !period}
          >
            Exportar TXT
          </button>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading && <SectionLoader message="Generando vista previa TXT…" />}

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
            emptyMessage="No hay comprobantes anulados en este período."
          />

          {preview.errors?.length > 0 && (
            <div className="alert alert-error">
              <strong>Errores de validación ({preview.errors.length})</strong>
              <ul className="dgii-error-list">
                {preview.errors.map((err, i) => (
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
