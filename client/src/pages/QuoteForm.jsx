import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { canEditQuoteContent } from '../constants/quoteEstados';

const FORMA_PAGO_OPTIONS = [
  'Efectivo / Transferencia',
  'Efectivo',
  'Transferencia',
];

const emptyItem = { descripcion: '', cantidad: 1, precio_unitario: 0 };
const ITBIS_RATE_DEFAULT = 18;

const emptyClient = {
  client_nombre: '',
  client_rnc: '',
  client_direccion: '',
  client_telefono: '',
  client_email: '',
};

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n || 0);
}

export default function QuoteForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);
  const [saveNewClient, setSaveNewClient] = useState(true);
  const [clientManual, setClientManual] = useState({ ...emptyClient });
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [validezDias, setValidezDias] = useState(30);
  const [ejecutivo, setEjecutivo] = useState(() => user?.nombre || '');
  const [formaPago, setFormaPago] = useState(FORMA_PAGO_OPTIONS[0]);
  const [notas, setNotas] = useState('');
  const [locked, setLocked] = useState(false);
  const [taxMode, setTaxMode] = useState('gravado_auto');
  const [itbisRate, setItbisRate] = useState(ITBIS_RATE_DEFAULT);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    api.clients.list().then(setClients).catch(console.error);
    if (!isEdit) {
      api.quotes.nextNumber().then((r) => setNumero(r.numero)).catch(console.error);
    }
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    api.quotes
      .get(id)
      .then((q) => {
        setClientId(q.client_id ? String(q.client_id) : '');
        setSaveNewClient(false);
        setClientSearch(q.client_nombre || '');
        setClientManual({
          client_nombre: q.client_nombre || '',
          client_rnc: q.client_rnc || '',
          client_direccion: q.client_direccion || '',
          client_telefono: q.client_telefono || '',
          client_email: q.client_email || '',
        });
        setNumero(q.numero);
        setFecha(q.fecha);
        setValidezDias(q.validez_dias);
        setEjecutivo(q.ejecutivo || user?.nombre || '');
        setFormaPago(q.forma_pago || FORMA_PAGO_OPTIONS[0]);
        setNotas(q.notas || '');
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
                precio_unitario: i.precio_unitario,
              }))
            : [{ ...emptyItem }]
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (s, i) => s + (Number(i.cantidad) || 0) * (Number(i.precio_unitario) || 0),
      0
    );
    const isExento = taxMode === 'exento';
    const itbisManual = taxMode === 'gravado_manual';
    const applyItbis = !isExento;
    const pct = applyItbis ? (itbisManual ? Number(itbisRate) || 0 : ITBIS_RATE_DEFAULT) : 0;
    const itbis = applyItbis ? subtotal * (pct / 100) : 0;
    return {
      subtotal,
      itbis,
      total: subtotal + itbis,
      itbisPercent: pct,
      isExento,
      subtotalExento: isExento ? subtotal : 0,
      subtotalGravado: applyItbis ? subtotal : 0,
    };
  }, [items, taxMode, itbisRate]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients.slice(0, 12);
    return clients
      .filter((c) => {
        const haystack = [c.nombre, c.rnc, c.email, c.telefono, c.direccion]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 12);
  }, [clients, clientSearch]);

  const fillClientFromRecord = (c) => {
    setClientManual({
      client_nombre: c.nombre || '',
      client_rnc: c.rnc || '',
      client_direccion: c.direccion || '',
      client_telefono: c.telefono || '',
      client_email: c.email || '',
    });
  };

  const pickClient = (c) => {
    setClientId(String(c.id));
    fillClientFromRecord(c);
    setClientSearch(c.nombre);
    setShowClientResults(false);
    setSaveNewClient(false);
  };

  const clearLinkedClient = () => {
    setClientId('');
    setClientManual({ ...emptyClient });
    setClientSearch('');
    setSaveNewClient(true);
  };

  const onClientFieldChange = (field, value) => {
    if (clientId) setClientId('');
    setClientManual((prev) => ({ ...prev, [field]: value }));
    if (field === 'client_nombre') setClientSearch(value);
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      let linkedClientId = clientId ? Number(clientId) : null;

      if (!linkedClientId && saveNewClient && clientManual.client_nombre.trim()) {
        const createdClient = await api.clients.create({
          nombre: clientManual.client_nombre.trim(),
          rnc: clientManual.client_rnc?.trim() || '',
          direccion: clientManual.client_direccion?.trim() || '',
          telefono: clientManual.client_telefono?.trim() || '',
          email: clientManual.client_email?.trim() || '',
        });
        linkedClientId = createdClient.id;
        setClients((prev) =>
          [...prev, createdClient].sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
      }

      const payload = {
        client_id: linkedClientId,
        numero: isEdit ? undefined : numero,
        fecha,
        validez_dias: validezDias,
        ejecutivo: ejecutivo.trim(),
        forma_pago: formaPago,
        notas,
        apply_itbis: taxMode !== 'exento',
        itbis_manual: taxMode === 'gravado_manual',
        itbis_rate:
          taxMode === 'gravado_manual' ? Number(itbisRate) || 0
          : taxMode === 'gravado_auto' ? ITBIS_RATE_DEFAULT
          : 0,
        items,
        ...clientManual,
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

          {clients.length > 0 && (
            <div className="client-search-wrap">
              <label>
                Buscar cliente guardado
                <input
                  type="search"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientResults(true);
                    if (clientId) setClientId('');
                  }}
                  onFocus={() => setShowClientResults(true)}
                  placeholder="Nombre, RNC, email o teléfono…"
                  autoComplete="off"
                />
              </label>
              {showClientResults && clientSearch.trim() && filteredClients.length > 0 && (
                <ul className="client-search-results" role="listbox">
                  {filteredClients.map((c) => (
                    <li key={c.id}>
                      <button type="button" role="option" onClick={() => pickClient(c)}>
                        <span className="client-search-name">{c.nombre}</span>
                        <span className="client-search-meta">
                          {[c.rnc && `RNC ${c.rnc}`, c.telefono, c.email].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showClientResults && clientSearch.trim() && filteredClients.length === 0 && (
                <p className="client-search-empty muted">Sin coincidencias. Completa los datos abajo.</p>
              )}
            </div>
          )}

          {clientId && (
            <div className="client-linked-banner">
              <span>Cliente vinculado desde tu lista</span>
              <button type="button" className="btn-ghost btn-sm" onClick={clearLinkedClient}>
                Cambiar / nuevo
              </button>
            </div>
          )}

          {!clientId && (
            <label className="checkbox-label save-client-check">
              <input
                type="checkbox"
                checked={saveNewClient}
                onChange={(e) => setSaveNewClient(e.target.checked)}
              />
              Guardar en mi lista de clientes
            </label>
          )}

          <div className="form-grid">
            <label>
              Nombre *
              <input
                value={clientManual.client_nombre}
                onChange={(e) => onClientFieldChange('client_nombre', e.target.value)}
                required
              />
            </label>
            <label>
              RNC
              <input
                value={clientManual.client_rnc}
                onChange={(e) => onClientFieldChange('client_rnc', e.target.value)}
              />
            </label>
            <label className="span-2">
              Dirección
              <input
                value={clientManual.client_direccion}
                onChange={(e) => onClientFieldChange('client_direccion', e.target.value)}
              />
            </label>
            <label>
              Teléfono
              <input
                value={clientManual.client_telefono}
                onChange={(e) => onClientFieldChange('client_telefono', e.target.value)}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={clientManual.client_email}
                onChange={(e) => onClientFieldChange('client_email', e.target.value)}
              />
            </label>
          </div>
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
                <th>Precio unit.</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const lineTotal = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0);
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
                        value={item.precio_unitario}
                        onChange={(e) => updateItem(idx, 'precio_unitario', e.target.value)}
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
            <div className="totals-rows">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(totals.subtotal)}</strong>
              </div>
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
