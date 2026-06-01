import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';
import AppModal from '../../components/AppModal';
import DgiiPeriodField, { buildPeriod, defaultPeriodParts } from '../../components/dgii/DgiiPeriodField';

const emptyPurchase = {
  ncf: '',
  supplier_rnc: '',
  supplier_cedula: '',
  tipo_identificacion: '1',
  tipo_bienes_servicios: '02',
  fecha_comprobante: '',
  fecha_pago: '',
  monto_facturado: '',
  itbis_facturado: '',
  itbis_retenido: '',
  isr_retenido: '',
  forma_pago: '',
  notas: '',
};

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(n || 0);
}

export default function DgiiFormat606() {
  const defaults = defaultPeriodParts();
  const [year, setYear] = useState(defaults.year);
  const [month, setMonth] = useState(defaults.month);
  const [purchases, setPurchases] = useState([]);
  const [goodsTypes, setGoodsTypes] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyPurchase);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const period = buildPeriod(year, month);

  useEffect(() => {
    api.dgii.catalogs().then((c) => setGoodsTypes(c.purchaseGoodsTypes || [])).catch(() => {});
  }, []);

  const loadPurchases = useCallback(async () => {
    if (!period) return;
    try {
      const list = await api.dgii.listPurchases(period);
      setPurchases(list);
    } catch {
      setPurchases([]);
    }
  }, [period]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const loadPreview = async () => {
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

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormBusy(true);
    try {
      await api.dgii.createPurchase(form);
      setModalOpen(false);
      setForm(emptyPurchase);
      await loadPurchases();
      setSuccess('Compra registrada.');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormBusy(false);
    }
  };

  const handleDeletePurchase = async (id) => {
    try {
      await api.dgii.deletePurchase(id);
      await loadPurchases();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <section className="panel">
        <h2 className="panel-title">Compras — Formato 606</h2>

        <DgiiPeriodField year={year} month={month} onYearChange={setYear} onMonthChange={setMonth} />

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn-ghost" onClick={() => setModalOpen(true)}>
            + Registrar compra
          </button>
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

      <section className="panel quotes-panel">
        <h3 className="panel-subtitle">Compras del período</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>NCF</th>
                <th>Proveedor</th>
                <th>RNC/Cédula</th>
                <th>Fecha</th>
                <th className="num">Monto</th>
                <th className="num">ITBIS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No hay compras registradas para este período.
                  </td>
                </tr>
              )}
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code>{p.ncf}</code>
                  </td>
                  <td>{p.supplier_nombre || '—'}</td>
                  <td>{p.supplier_rnc || p.supplier_cedula || '—'}</td>
                  <td>{p.fecha_comprobante}</td>
                  <td className="num">{formatMoney(p.monto_facturado)}</td>
                  <td className="num">{formatMoney(p.itbis_facturado)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-icon-danger btn-sm"
                      onClick={() => handleDeletePurchase(p.id)}
                      title="Eliminar compra"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {preview && (
        <section className="panel quotes-panel">
          <p className="muted">
            Registros para exportación: <strong>{preview.recordCount}</strong>
          </p>
          {preview.errors?.length > 0 && (
            <div className="alert alert-error">
              <ul className="dgii-error-list">
                {preview.errors.map((err, i) => (
                  <li key={i}>{err.error}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <AppModal
        open={modalOpen}
        onClose={() => !formBusy && setModalOpen(false)}
        title="Registrar compra"
        size="md"
        footer={
          <div className="app-modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)} disabled={formBusy}>
              Cancelar
            </button>
            <button type="submit" form="dgii-purchase-form" className="btn-primary" disabled={formBusy}>
              {formBusy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        }
      >
        {formError && <div className="alert alert-error">{formError}</div>}
        <form id="dgii-purchase-form" className="form-grid" onSubmit={handleSavePurchase}>
          <label>
            NCF proveedor
            <input
              required
              value={form.ncf}
              onChange={(e) => setForm({ ...form, ncf: e.target.value })}
              placeholder="B0100000126"
            />
          </label>
          <label>
            Tipo identificación
            <select
              value={form.tipo_identificacion}
              onChange={(e) => setForm({ ...form, tipo_identificacion: e.target.value })}
            >
              <option value="1">RNC</option>
              <option value="2">Cédula</option>
            </select>
          </label>
          <label>
            RNC
            <input
              value={form.supplier_rnc}
              onChange={(e) => setForm({ ...form, supplier_rnc: e.target.value })}
            />
          </label>
          <label>
            Cédula
            <input
              value={form.supplier_cedula}
              onChange={(e) => setForm({ ...form, supplier_cedula: e.target.value })}
            />
          </label>
          <label>
            Tipo bien/servicio
            <select
              value={form.tipo_bienes_servicios}
              onChange={(e) => setForm({ ...form, tipo_bienes_servicios: e.target.value })}
            >
              {goodsTypes.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.code} — {g.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha comprobante
            <input
              type="date"
              required
              value={form.fecha_comprobante}
              onChange={(e) => setForm({ ...form, fecha_comprobante: e.target.value })}
            />
          </label>
          <label>
            Fecha pago
            <input
              type="date"
              value={form.fecha_pago}
              onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })}
            />
          </label>
          <label>
            Monto facturado
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.monto_facturado}
              onChange={(e) => setForm({ ...form, monto_facturado: e.target.value })}
            />
          </label>
          <label>
            ITBIS facturado
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.itbis_facturado}
              onChange={(e) => setForm({ ...form, itbis_facturado: e.target.value })}
            />
          </label>
          <label>
            ITBIS retenido
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.itbis_retenido}
              onChange={(e) => setForm({ ...form, itbis_retenido: e.target.value })}
            />
          </label>
          <label>
            ISR retenido
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.isr_retenido}
              onChange={(e) => setForm({ ...form, isr_retenido: e.target.value })}
            />
          </label>
          <label className="span-2">
            Notas
            <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </label>
        </form>
      </AppModal>
    </>
  );
}
