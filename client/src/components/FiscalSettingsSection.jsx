import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyRange = {
  tipo_comprobante: 'Factura de crédito fiscal',
  serie: 'B02',
  prefijo: '',
  numero_inicial: 1,
  numero_final: 999999,
  ultimo_numero_utilizado: 0,
  fecha_vencimiento: '',
  estado: 'activo',
};

function padSeq(n) {
  return String(n).padStart(9, '0');
}

export default function FiscalSettingsSection() {
  const [ranges, setRanges] = useState([]);
  const [form, setForm] = useState(emptyRange);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () =>
    api.fiscal
      .list()
      .then(setRanges)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyRange);
    setEditingId(null);
  };

  const handleEdit = (range) => {
    setEditingId(range.id);
    setForm({
      tipo_comprobante: range.tipo_comprobante,
      serie: range.serie,
      prefijo: range.prefijo || '',
      numero_inicial: range.numero_inicial,
      numero_final: range.numero_final,
      ultimo_numero_utilizado: range.ultimo_numero_utilizado,
      fecha_vencimiento: range.fecha_vencimiento || '',
      estado: range.estado,
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
        ...form,
        numero_inicial: Number(form.numero_inicial),
        numero_final: Number(form.numero_final),
        ultimo_numero_utilizado: Number(form.ultimo_numero_utilizado),
        fecha_vencimiento: form.fecha_vencimiento || null,
        prefijo: form.prefijo?.trim() || null,
      };
      if (editingId) {
        await api.fiscal.update(editingId, payload);
        setSuccess('Rango fiscal actualizado.');
      } else {
        await api.fiscal.create(payload);
        setSuccess('Rango fiscal registrado.');
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
    form.serie && Number(form.ultimo_numero_utilizado) >= 0
      ? `${String(form.serie).trim().toUpperCase()}${padSeq(Number(form.ultimo_numero_utilizado) + 1)}`
      : '—';

  if (loading) return <p className="muted">Cargando facturación fiscal…</p>;

  return (
    <section className="panel" style={{ marginTop: '1.5rem' }}>
      <div className="form-section-title">
        <h2>Facturación fiscal</h2>
        <p className="muted">
          Configure el rango de comprobantes fiscales. Solo un rango puede estar activo a la vez.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="span-2">
          Tipo de comprobante
          <input
            value={form.tipo_comprobante}
            onChange={(e) => setForm({ ...form, tipo_comprobante: e.target.value })}
            required
          />
        </label>
        <label>
          Serie *
          <input
            value={form.serie}
            onChange={(e) => setForm({ ...form, serie: e.target.value.toUpperCase() })}
            placeholder="B02"
            required
          />
        </label>
        <label>
          Prefijo
          <input
            value={form.prefijo}
            onChange={(e) => setForm({ ...form, prefijo: e.target.value })}
          />
        </label>
        <label>
          Número inicial autorizado *
          <input
            type="number"
            min={0}
            value={form.numero_inicial}
            onChange={(e) => setForm({ ...form, numero_inicial: e.target.value })}
            required
          />
        </label>
        <label>
          Número final autorizado *
          <input
            type="number"
            min={0}
            value={form.numero_final}
            onChange={(e) => setForm({ ...form, numero_final: e.target.value })}
            required
          />
        </label>
        <label>
          Último número utilizado
          <input
            type="number"
            min={0}
            value={form.ultimo_numero_utilizado}
            onChange={(e) => setForm({ ...form, ultimo_numero_utilizado: e.target.value })}
          />
        </label>
        <label>
          Fecha de vencimiento del rango
          <input
            type="date"
            value={form.fecha_vencimiento}
            onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
          />
        </label>
        <label>
          Estado
          <select
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value })}
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </label>
        <p className="muted span-2">
          Próximo número fiscal estimado: <strong>{previewNext}</strong>
        </p>
        <div className="form-actions span-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : editingId ? 'Actualizar rango' : 'Registrar rango'}
          </button>
          {editingId && (
            <button type="button" className="btn-ghost" onClick={resetForm}>
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      {ranges.length > 0 && (
        <div className="table-wrap" style={{ marginTop: '1.5rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Serie</th>
                <th>Rango</th>
                <th>Último</th>
                <th>Vence</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ranges.map((r) => (
                <tr key={r.id}>
                  <td>{r.serie}</td>
                  <td>
                    {padSeq(r.numero_inicial)} – {padSeq(r.numero_final)}
                  </td>
                  <td>{padSeq(r.ultimo_numero_utilizado)}</td>
                  <td>{r.fecha_vencimiento || '—'}</td>
                  <td>
                    <span className={`badge badge-${r.estado === 'activo' ? 'ok' : 'muted'}`}>
                      {r.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => handleEdit(r)}>
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
  );
}
