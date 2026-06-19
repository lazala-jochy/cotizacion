import { useEffect, useState } from 'react';
import { api } from '../api';
import { SectionLoader } from './loading';
import LoadingOverlay from './LoadingOverlay';

const emptySequence = {
  fiscal_document_type_id: '',
  start_number: 1,
  end_number: 99999999,
  last_used_number: 0,
  expiration_date: '',
  is_active: true,
};

function padSeq(n) {
  return String(n).padStart(8, '0');
}

export default function FiscalSettingsSection() {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [form, setForm] = useState(emptySequence);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () =>
    Promise.all([api.fiscal.documentTypes(), api.fiscal.sequences()])
      .then(([types, seqs]) => {
        setDocumentTypes(types);
        setSequences(seqs);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptySequence);
    setEditingId(null);
  };

  const selectedType = documentTypes.find(
    (t) => t.id === Number(form.fiscal_document_type_id)
  );

  const handleEdit = (seq) => {
    setEditingId(seq.id);
    setForm({
      fiscal_document_type_id: String(seq.fiscal_document_type_id),
      start_number: seq.start_number,
      end_number: seq.end_number,
      last_used_number: seq.last_used_number,
      expiration_date: seq.expiration_date || '',
      is_active: seq.is_active,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        fiscal_document_type_id: Number(form.fiscal_document_type_id),
        start_number: Number(form.start_number),
        end_number: Number(form.end_number),
        last_used_number: Number(form.last_used_number),
        expiration_date: form.expiration_date || null,
        is_active: form.is_active,
      };
      if (editingId) {
        await api.fiscal.updateSequence(editingId, payload);
        setSuccess('Rango actualizado.');
      } else {
        await api.fiscal.createSequence(payload);
        setSuccess('Rango registrado.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const previewNext =
    selectedType && Number(form.last_used_number) >= 0
      ? `${selectedType.code}${padSeq(Number(form.last_used_number) + 1)}`
      : '—';

  if (loading) return <SectionLoader message="Cargando comprobantes fiscales…" />;

  return (
    <>
      <LoadingOverlay show={saving} fixed message="Guardando comprobante fiscal…" />
      <section className="panel" style={{ marginTop: '1.5rem' }}>
      <div className="form-section-title">
        <h2>Comprobantes fiscales</h2>
        <p className="muted">
          Registre un rango independiente por cada tipo de comprobante (B01, B02, E31, etc.). Al
          convertir una cotización en factura, se usa el rango activo del tipo elegido.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="span-2">
          Tipo de comprobante *
          <select
            value={form.fiscal_document_type_id}
            onChange={(e) =>
              setForm({ ...form, fiscal_document_type_id: e.target.value })
            }
            required
            disabled={Boolean(editingId)}
          >
            <option value="">Seleccione…</option>
            {documentTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} — {t.name}
                {t.requires_tax_id ? ' (requiere RNC)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Número inicial autorizado *
          <input
            type="number"
            min={0}
            value={form.start_number}
            onChange={(e) => setForm({ ...form, start_number: e.target.value })}
            required
          />
        </label>
        <label>
          Número final autorizado *
          <input
            type="number"
            min={0}
            max={99999999}
            value={form.end_number}
            onChange={(e) => setForm({ ...form, end_number: e.target.value })}
            required
          />
          <span className="field-hint muted">
            Puede ampliar este valor si el rango se agota (máx. 99.999.999, 8 dígitos).
          </span>
        </label>
        <label>
          Último número utilizado
          <input
            type="number"
            min={0}
            value={form.last_used_number}
            onChange={(e) => setForm({ ...form, last_used_number: e.target.value })}
          />
        </label>
        <label>
          Fecha de vencimiento del rango
          <input
            type="date"
            value={form.expiration_date}
            onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
          />
        </label>
        <label>
          Activo
          <select
            value={form.is_active ? '1' : '0'}
            onChange={(e) => setForm({ ...form, is_active: e.target.value === '1' })}
          >
            <option value="1">Sí</option>
            <option value="0">No</option>
          </select>
        </label>
        <p className="muted span-2">
          Próximo número fiscal estimado: <strong>{previewNext}</strong>
        </p>
        <div className="form-actions span-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {editingId ? 'Actualizar rango' : 'Registrar rango'}
          </button>
          {editingId && (
            <button type="button" className="btn-ghost" onClick={resetForm}>
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      {sequences.length > 0 && (
        <div className="table-wrap" style={{ marginTop: '1.5rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Rango</th>
                <th>Último</th>
                <th>Vence</th>
                <th>Activo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sequences.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.document_type_code}</strong>
                    <br />
                    <span className="muted small">{s.document_type_name}</span>
                  </td>
                  <td>
                    {padSeq(s.start_number)} – {padSeq(s.end_number)}
                  </td>
                  <td>{padSeq(s.last_used_number)}</td>
                  <td>{s.expiration_date || '—'}</td>
                  <td>
                    <span className={`badge badge-${s.is_active ? 'ok' : 'muted'}`}>
                      {s.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => handleEdit(s)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
    </>
  );
}
