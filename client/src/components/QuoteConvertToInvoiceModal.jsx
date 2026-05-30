import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AppModal from './AppModal';

/**
 * Modal para convertir cotización → factura eligiendo tipo de comprobante (NCF / e-CF).
 */
export default function QuoteConvertToInvoiceModal({
  open,
  onClose,
  quoteId,
  quoteNumero,
  clientRnc,
  onConverted,
  onError,
}) {
  const [types, setTypes] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setPreview(null);
    setSelectedTypeId('');
    setLoadingTypes(true);
    Promise.all([api.fiscal.documentTypes(), api.fiscal.sequences()])
      .then(([docTypes, seqs]) => {
        setTypes(docTypes);
        setSequences(seqs);
        const activeWithRange = docTypes.filter((t) =>
          seqs.some((s) => s.fiscal_document_type_id === t.id && s.is_active)
        );
        if (activeWithRange.length === 1) {
          setSelectedTypeId(String(activeWithRange[0].id));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingTypes(false));
  }, [open]);

  const selectedType = useMemo(
    () => types.find((t) => t.id === Number(selectedTypeId)),
    [types, selectedTypeId]
  );

  const hasActiveRange = useMemo(
    () =>
      selectedTypeId &&
      sequences.some(
        (s) => s.fiscal_document_type_id === Number(selectedTypeId) && s.is_active
      ),
    [sequences, selectedTypeId]
  );

  const rncMissing = selectedType?.requires_tax_id && !String(clientRnc || '').trim();

  useEffect(() => {
    if (!open || !selectedTypeId || rncMissing) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    api.fiscal
      .previewNextForType(Number(selectedTypeId))
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setPreview(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedTypeId, rncMissing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTypeId || rncMissing) return;
    setBusy(true);
    setError('');
    try {
      const invoice = await api.invoices.fromQuote(quoteId, {
        fiscal_document_type_id: Number(selectedTypeId),
      });
      onConverted?.(invoice);
      onClose();
    } catch (err) {
      const msg = err.message || 'No se pudo crear la factura';
      setError(msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  };

  const groupedTypes = useMemo(() => {
    const trad = types.filter((t) => !t.is_electronic);
    const elec = types.filter((t) => t.is_electronic);
    return { trad, elec };
  }, [types]);

  return (
    <AppModal
      open={open}
      onClose={() => !busy && onClose()}
      title="Convertir a factura"
      subtitle={quoteNumero ? `Cotización ${quoteNumero}` : undefined}
      titleId="convert-invoice-modal-title"
      size="md"
      footer={
        <div className="app-modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="submit"
            form="convert-invoice-form"
            className="btn-primary"
            disabled={busy || !selectedTypeId || rncMissing || !hasActiveRange}
          >
            {busy ? 'Convirtiendo…' : 'Crear factura'}
          </button>
        </div>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}

      <p className="app-modal-message">
        Elija el tipo de comprobante. Se asignará el siguiente número fiscal del rango activo de
        ese tipo. La cotización original <strong>no se modifica</strong>.
      </p>

      {loadingTypes ?
        <p className="muted">Cargando tipos de comprobante…</p>
      : <form id="convert-invoice-form" className="form-grid" onSubmit={handleSubmit}>
          <label className="span-2">
            Tipo de comprobante *
            <select
              value={selectedTypeId}
              onChange={(e) => {
                setSelectedTypeId(e.target.value);
                setError('');
              }}
              required
            >
              <option value="">Seleccione…</option>
              {groupedTypes.trad.length > 0 && (
                <optgroup label="Tradicionales">
                  {groupedTypes.trad.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedTypes.elec.length > 0 && (
                <optgroup label="Electrónicos (e-CF)">
                  {groupedTypes.elec.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          {selectedTypeId && !hasActiveRange && (
            <p className="alert alert-warn span-2">
              No hay un rango <strong>activo</strong> para este tipo. Regístrelo en{' '}
              <Link to="/configuracion" onClick={onClose}>
                Empresa → Comprobantes fiscales
              </Link>
              .
            </p>
          )}

          {rncMissing && (
            <p className="alert alert-error span-2">
              Este tipo de comprobante requiere que el cliente tenga un RNC registrado.
            </p>
          )}

          {selectedTypeId && hasActiveRange && !rncMissing && (
            <p className="muted span-2">
              Próximo número fiscal:{' '}
              <strong>
                {loadingPreview ?
                  'Calculando…'
                : preview?.fiscal_number || '—'}
              </strong>
              {preview?.document_type_name && (
                <span> ({preview.document_type_code} — {preview.document_type_name})</span>
              )}
            </p>
          )}
        </form>
      }

      <p className="app-modal-hint muted">
        Configure rangos por tipo en{' '}
        <Link to="/configuracion" onClick={onClose}>
          Empresa → Comprobantes fiscales
        </Link>
        .
      </p>
    </AppModal>
  );
}
