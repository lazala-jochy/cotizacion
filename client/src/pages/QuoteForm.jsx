import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

const emptyItem = { descripcion: '', cantidad: 1, precio_unitario: 0 };
const ITBIS_RATE = 0.18;

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n || 0);
}

export default function QuoteForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [clientManual, setClientManual] = useState({
    client_nombre: '',
    client_rnc: '',
    client_direccion: '',
    client_telefono: '',
    client_email: '',
  });
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [validezDias, setValidezDias] = useState(30);
  const [notas, setNotas] = useState('');
  const [estado, setEstado] = useState('borrador');
  const [applyItbis, setApplyItbis] = useState(true);
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
        setNotas(q.notas || '');
        setEstado(q.estado);
        setApplyItbis(q.itbis > 0);
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
    const itbis = applyItbis ? subtotal * ITBIS_RATE : 0;
    return { subtotal, itbis, total: subtotal + itbis };
  }, [items, applyItbis]);

  const onClientSelect = (value) => {
    setClientId(value);
    if (!value) return;
    const c = clients.find((x) => String(x.id) === value);
    if (c) {
      setClientManual({
        client_nombre: c.nombre,
        client_rnc: c.rnc || '',
        client_direccion: c.direccion || '',
        client_telefono: c.telefono || '',
        client_email: c.email || '',
      });
    }
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      client_id: clientId ? Number(clientId) : null,
      numero: isEdit ? undefined : numero,
      fecha,
      validez_dias: validezDias,
      notas,
      estado,
      apply_itbis: applyItbis,
      items,
      ...clientManual,
    };
    try {
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
              Estado
              <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="borrador">Borrador</option>
                <option value="enviada">Enviada</option>
                <option value="aceptada">Aceptada</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </label>
          </div>
        </section>

        <section className="panel">
          <h2>Cliente</h2>
          <label>
            Seleccionar cliente guardado
            <select value={clientId} onChange={(e) => onClientSelect(e.target.value)}>
              <option value="">— Manual / nuevo —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Nombre *
              <input
                value={clientManual.client_nombre}
                onChange={(e) =>
                  setClientManual({ ...clientManual, client_nombre: e.target.value })
                }
                required
              />
            </label>
            <label>
              RNC
              <input
                value={clientManual.client_rnc}
                onChange={(e) => setClientManual({ ...clientManual, client_rnc: e.target.value })}
              />
            </label>
            <label className="span-2">
              Dirección
              <input
                value={clientManual.client_direccion}
                onChange={(e) =>
                  setClientManual({ ...clientManual, client_direccion: e.target.value })
                }
              />
            </label>
            <label>
              Teléfono
              <input
                value={clientManual.client_telefono}
                onChange={(e) =>
                  setClientManual({ ...clientManual, client_telefono: e.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={clientManual.client_email}
                onChange={(e) =>
                  setClientManual({ ...clientManual, client_email: e.target.value })
                }
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

          <div className="totals-box">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={applyItbis}
                onChange={(e) => setApplyItbis(e.target.checked)}
              />
              Aplicar ITBIS (18%)
            </label>
            <div className="totals-rows">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(totals.subtotal)}</strong>
              </div>
              {applyItbis && (
                <div>
                  <span>ITBIS 18%</span>
                  <strong>{formatMoney(totals.itbis)}</strong>
                </div>
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
