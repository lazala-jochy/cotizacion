import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { canEditQuoteContent } from '../constants/quoteEstados';
import ClientFields, { EMPTY_CLIENT_FORM } from '../components/ClientFields';
import { buildQuoteClientSuggestions } from '../utils/quoteClientSuggestions';

const FORMA_PAGO_OPTIONS = [
  'Efectivo / Transferencia',
  'Efectivo',
  'Transferencia',
];

const emptyItem = { descripcion: '', cantidad: 1, precio_unitario: 0, costo_unitario: 0 };
const ITBIS_RATE_DEFAULT = 18;

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n || 0);
}

export default function QuoteForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quoteSuggestions, setQuoteSuggestions] = useState([]);
  const [clientForm, setClientForm] = useState({ ...EMPTY_CLIENT_FORM });
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [validezDias, setValidezDias] = useState(30);
  const [ejecutivo, setEjecutivo] = useState(() => user?.nombre || '');
  const [formaPago, setFormaPago] = useState(FORMA_PAGO_OPTIONS[0]);
  const [notas, setNotas] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [locked, setLocked] = useState(false);
  const [taxMode, setTaxMode] = useState('gravado_auto');
  const [itbisRate, setItbisRate] = useState(ITBIS_RATE_DEFAULT);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    api.quotes
      .list()
      .then((list) => setQuoteSuggestions(buildQuoteClientSuggestions(list)))
      .catch(console.error);
    if (!isEdit) {
      api.quotes.nextNumber().then((r) => setNumero(r.numero)).catch(console.error);
    }
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    api.quotes
      .get(id)
      .then((q) => {
        setClientForm({
          nombre: q.client_nombre || '',
          rnc: q.client_rnc || '',
          direccion: q.client_direccion || '',
          telefono: q.client_telefono || '',
          email: q.client_email || '',
        });
        setNumero(q.numero);
        setFecha(q.fecha);
        setValidezDias(q.validez_dias);
        setEjecutivo(q.ejecutivo || user?.nombre || '');
        setFormaPago(q.forma_pago || FORMA_PAGO_OPTIONS[0]);
        setNotas(q.notas || '');
        setDescuento(q.descuento || 0);
        setLocked(!canEditQuoteContent(q.estado));
        const hasItbis = q.itbis > 0;
        const manual = q.itbis_manual === 1 || q.itbis_manual === true;
        let rate = q.itbis_rate != null ? Number(q.itbis_rate) : ITBIS_RATE_DEFAULT;
        if (hasItbis && q.subtotal > 0 && q.itbis_rate == null) {
          rate = Math.round((q.itbis / q.subtotal) * 10000) / 100;
        }
        if (!hasItbis) {
          setTaxMode('exento');
        } else if (manual || Math.abs(rate - ITBIS_RATE_DEFAULT) > 0.01) {
          setTaxMode('gravado_manual');
        } else {
          setTaxMode('gravado_auto');
        }
        setItbisRate(rate);
        setItems(
          q.items.length
            ? q.items.map((i) => ({
                descripcion: i.descripcion,
                cantidad: i.cantidad,
                precio_unitario: Number(i.costo_unitario) || Number(i.precio_unitario) || 0,
                costo_unitario: Number(i.costo_unitario) || Number(i.precio_unitario) || 0,
              }))
            : [{ ...emptyItem }]
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (s, i) => s + (Number(i.cantidad) || 0) * (Number(i.costo_unitario) || 0),
      0
    );
    const disc = Math.max(0, Math.min(subtotal, Number(descuento) || 0));
    const base = Math.max(0, subtotal - disc);
    const isExento = taxMode === 'exento';
    const itbisManual = taxMode === 'gravado_manual';
    const applyItbis = !isExento;
    const pct = applyItbis ? (itbisManual ? Number(itbisRate) || 0 : ITBIS_RATE_DEFAULT) : 0;
    const itbis = applyItbis ? base * (pct / 100) : 0;
    return {
      subtotal,
      descuento: disc,
      itbis,
      total: base + itbis,
      itbisPercent: pct,
      isExento,
      subtotalExento: isExento ? base : 0,
      subtotalGravado: applyItbis ? base : 0,
    };
  }, [items, taxMode, itbisRate, descuento]);

  const updateItem = (idx, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const next = { ...item, [field]: value };
        if (field === 'costo_unitario') {
          next.precio_unitario = value;
        }
        return next;
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const disc = Number(descuento) || 0;
    if (disc > totals.subtotal + 0.009) {
      setError('El descuento no puede ser mayor al subtotal.');
      return;
    }

    try {
      const payload = {
        numero: isEdit ? undefined : numero,
        fecha,
        validez_dias: validezDias,
        ejecutivo: ejecutivo.trim(),
        forma_pago: formaPago,
        notas,
        descuento: Number(descuento) || 0,
        apply_itbis: taxMode !== 'exento',
        itbis_manual: taxMode === 'gravado_manual',
        itbis_rate:
          taxMode === 'gravado_manual' ? Number(itbisRate) || 0
          : taxMode === 'gravado_auto' ? ITBIS_RATE_DEFAULT
          : 0,
        items,
        client_nombre: clientForm.nombre.trim(),
        client_rnc: clientForm.rnc?.trim() || '',
        client_direccion: clientForm.direccion?.trim() || '',
        client_telefono: clientForm.telefono?.trim() || '',
        client_email: clientForm.email?.trim() || '',
      };

      if (isEdit) {
        await api.quotes.update(id, payload);
        navigate(`/cotizaciones/${id}`);
      } else {
        const created = await api.quotes.create(payload);
        navigate(`/cotizaciones/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };


  if (loading) return <div className="page"><p className="muted">Cargando…</p></div>;

  if (locked) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <h1>Cotización {numero}</h1>
            <p>Esta cotización ya no está en estado Creada y no se puede editar aquí.</p>
          </div>
        </header>
        <div className="alert alert-warn">
          Usa la vista de detalle para cambiar el estado del proceso o registrar pagos.
        </div>
        <Link to={`/cotizaciones/${id}`} className="btn-primary">
          Ir a detalle de cotización
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{isEdit ? 'Editar cotización' : 'Nueva cotización'}</h1>
          <p>Completa los datos del cliente y los ítems de la cotización</p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="quote-form">
        <section className="panel">
          <h2>Datos generales</h2>
          <div className="form-grid">
            <label>
              Número
              <input value={numero} disabled={isEdit} onChange={(e) => setNumero(e.target.value)} />
            </label>
            <label>
              Fecha
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </label>
            <label>
              Validez (días)
              <input
                type="number"
                min={1}
                value={validezDias}
                onChange={(e) => setValidezDias(Number(e.target.value))}
              />
            </label>
            <label>
              Ejecutivo
              <input
                type="text"
                value={ejecutivo}
                onChange={(e) => setEjecutivo(e.target.value)}
                placeholder="Nombre de quien atiende la cotización"
              />
            </label>
            <label>
              Forma de pago
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                {FORMA_PAGO_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!isEdit && (
            <p className="panel-hint">Se creará en estado <strong>Creada</strong>. Podrás avanzar el flujo desde el detalle.</p>
          )}
        </section>

        <section className="panel">
          <h2>Cliente</h2>
          <ClientFields
            suggestions={quoteSuggestions}
            value={clientForm}
            onChange={setClientForm}
          />
        </section>

        <section className="panel">
          <div className="panel-header-row">
            <h2>Ítems</h2>
            <button type="button" className="btn-ghost btn-sm" onClick={addItem}>
              + Agregar ítem
            </button>
          </div>
          <div className="items-table-wrap">
          <table className="items-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cant.</th>
                <th>Costo unit.</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const lineTotal = (Number(item.cantidad) || 0) * (Number(item.costo_unitario) || 0);
                return (
                  <tr key={idx}>
                    <td>
                      <input
                        value={item.descripcion}
                        onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
                        placeholder="Descripción del servicio o producto"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.cantidad}
                        onChange={(e) => updateItem(idx, 'cantidad', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.costo_unitario ?? 0}
                        onChange={(e) => updateItem(idx, 'costo_unitario', e.target.value)}
                        title="Costo unitario del ítem"
                      />
                    </td>
                    <td className="line-total">{formatMoney(lineTotal)}</td>
                    <td>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn-ghost btn-sm danger"
                          onClick={() => removeItem(idx)}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          <div className="totals-box">
            <div className="tax-options">
              <p className="tax-options-title">Impuestos</p>
              <div className="tax-mode">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="taxMode"
                    value="gravado_auto"
                    checked={taxMode === 'gravado_auto'}
                    onChange={() => setTaxMode('gravado_auto')}
                  />
                  ITBIS {ITBIS_RATE_DEFAULT}% (automático)
                </label>
                <label className="radio-label itbis-manual-row">
                  <input
                    type="radio"
                    name="taxMode"
                    value="gravado_manual"
                    checked={taxMode === 'gravado_manual'}
                    onChange={() => setTaxMode('gravado_manual')}
                  />
                  ITBIS manual
                  <input
                    type="number"
                    className="itbis-rate-input"
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={taxMode !== 'gravado_manual'}
                    value={itbisRate}
                    onChange={(e) => setItbisRate(e.target.value)}
                    aria-label="Porcentaje de ITBIS"
                  />
                  <span>%</span>
                </label>
                <label className="radio-label tax-exempt-label">
                  <input
                    type="radio"
                    name="taxMode"
                    value="exento"
                    checked={taxMode === 'exento'}
                    onChange={() => setTaxMode('exento')}
                  />
                  Exento de impuestos
                </label>
              </div>
            </div>
            <label className="quote-discount-field">
              Descuento (opcional, RD$)
              <input
                type="number"
                min="0"
                max={totals.subtotal || undefined}
                step="0.01"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                placeholder="0"
              />
              {Number(descuento) > totals.subtotal + 0.009 && (
                <span className="field-hint alert-warn">
                  No puede superar el subtotal ({formatMoney(totals.subtotal)}).
                </span>
              )}
            </label>
            <div className="totals-rows">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(totals.subtotal)}</strong>
              </div>
              {totals.descuento > 0 && (
                <div>
                  <span>Descuento</span>
                  <strong>−{formatMoney(totals.descuento)}</strong>
                </div>
              )}
              {totals.isExento ? (
                <div>
                  <span>Subtotal exento</span>
                  <strong>{formatMoney(totals.subtotalExento)}</strong>
                </div>
              ) : (
                <>
                  <div>
                    <span>Subtotal gravado</span>
                    <strong>{formatMoney(totals.subtotalGravado)}</strong>
                  </div>
                  <div>
                    <span>ITBIS ({totals.itbisPercent}%)</span>
                    <strong>{formatMoney(totals.itbis)}</strong>
                  </div>
                </>
              )}
              <div className="total-final">
                <span>Total</span>
                <strong>{formatMoney(totals.total)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <label>
            Notas / condiciones
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Términos, forma de pago, observaciones…"
            />
          </label>
        </section>

        <div className="form-actions-bar">
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            {isEdit ? 'Guardar cambios' : 'Crear cotización'}
          </button>
        </div>
      </form>
    </div>
  );
}
