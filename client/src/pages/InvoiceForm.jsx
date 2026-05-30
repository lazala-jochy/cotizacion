import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { INVOICE_ESTADOS, canEditInvoice } from '../constants/invoiceEstados';
import ClientFields, { EMPTY_CLIENT_FORM } from '../components/ClientFields';

const FORMA_PAGO_OPTIONS = [
  'Efectivo / Transferencia',
  'Efectivo',
  'Transferencia',
];

const emptyItem = { descripcion: '', cantidad: 1, precio_unitario: 0 };
const ITBIS_RATE_DEFAULT = 18;

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n || 0);
}

export default function InvoiceForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [clientForm, setClientForm] = useState({ ...EMPTY_CLIENT_FORM });
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [estado, setEstado] = useState('pendiente');
  const [ejecutivo, setEjecutivo] = useState('');
  const [formaPago, setFormaPago] = useState(FORMA_PAGO_OPTIONS[0]);
  const [notas, setNotas] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [montoPagado, setMontoPagado] = useState(0);
  const [taxMode, setTaxMode] = useState('gravado_auto');
  const [itbisRate, setItbisRate] = useState(ITBIS_RATE_DEFAULT);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [fiscalNumber, setFiscalNumber] = useState('');
  const [numeroInterno, setNumeroInterno] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (isEdit) return;
    api.invoices
      .nextFiscalNumber()
      .then((r) => setFiscalNumber(r.fiscal_number || ''))
      .catch((e) => setError(e.message));
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    api.invoices
      .get(id)
      .then((inv) => {
        if (!canEditInvoice(inv.estado)) setLocked(true);
        setClientForm({
          nombre: inv.client_nombre || '',
          rnc: inv.client_rnc || '',
          direccion: inv.client_direccion || '',
          telefono: inv.client_telefono || '',
          email: inv.client_email || '',
        });
        setFiscalNumber(inv.fiscal_number || '');
        setNumeroInterno(inv.numero || '');
        setFechaEmision(inv.fecha_emision);
        setFechaVencimiento(inv.fecha_vencimiento || '');
        setEstado(inv.estado);
        setEjecutivo(inv.ejecutivo || '');
        setFormaPago(inv.forma_pago || FORMA_PAGO_OPTIONS[0]);
        setNotas(inv.notas || '');
        setDescuento(inv.descuento || 0);
        setMontoPagado(inv.monto_pagado || 0);
        const hasItbis = inv.itbis > 0;
        const manual = inv.itbis_manual === 1 || inv.itbis_manual === true;
        if (!hasItbis) setTaxMode('exento');
        else if (manual) setTaxMode('gravado_manual');
        else setTaxMode('gravado_auto');
        setItbisRate(inv.itbis_rate ?? ITBIS_RATE_DEFAULT);
        setItems(
          inv.items?.length
            ? inv.items.map((i) => ({
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
    const disc = Math.max(0, Number(descuento) || 0);
    const base = Math.max(0, subtotal - disc);
    const isExento = taxMode === 'exento';
    const itbisManual = taxMode === 'gravado_manual';
    const applyItbis = !isExento;
    const pct = applyItbis ? (itbisManual ? Number(itbisRate) || 0 : ITBIS_RATE_DEFAULT) : 0;
    const itbis = applyItbis ? base * (pct / 100) : 0;
    return { subtotal, descuento: disc, itbis, total: base + itbis };
  }, [items, taxMode, itbisRate, descuento]);

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      fiscal_number: fiscalNumber.trim(),
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento || null,
      estado,
      ejecutivo: ejecutivo.trim(),
      forma_pago: formaPago,
      notas,
      descuento: Number(descuento) || 0,
      monto_pagado: Number(montoPagado) || 0,
      apply_itbis: taxMode !== 'exento',
      itbis_manual: taxMode === 'gravado_manual',
      itbis_rate:
        taxMode === 'gravado_manual'
          ? Number(itbisRate) || 0
          : taxMode === 'gravado_auto'
            ? ITBIS_RATE_DEFAULT
            : 0,
      items,
      client_nombre: clientForm.nombre.trim(),
      client_rnc: clientForm.rnc?.trim() || '',
      client_direccion: clientForm.direccion?.trim() || '',
      client_telefono: clientForm.telefono?.trim() || '',
      client_email: clientForm.email?.trim() || '',
    };

    try {
      if (isEdit) {
        const updated = await api.invoices.update(id, payload);
        navigate(`/facturas/${id}`, { state: { invoice: updated } });
      } else {
        const created = await api.invoices.create(payload);
        navigate(`/facturas/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page"><p className="muted">Cargando…</p></div>;

  if (locked) {
    return (
      <div className="page">
        <div className="alert alert-warn">Esta factura está anulada y no se puede editar.</div>
        <Link to={`/facturas/${id}`} className="btn-primary">
          Ver factura
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{isEdit ? 'Editar factura' : 'Nueva factura'}</h1>
          <p className="muted">
            Número fiscal (NCF) según el rango activo en Empresa. Puede ajustarlo antes de guardar.
          </p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="quote-form">
        <section className="panel">
          <h2>Datos generales</h2>
          <div className="form-grid">
            <label>
              Número de factura (NCF) *
              <input
                value={fiscalNumber}
                onChange={(e) => setFiscalNumber(e.target.value.toUpperCase())}
                placeholder="Ej: B02000000126"
                required
                spellCheck={false}
              />
            </label>
            {isEdit && numeroInterno && (
              <label>
                Referencia interna
                <input value={numeroInterno} disabled />
              </label>
            )}
            <label>
              Fecha de emisión
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                required
              />
            </label>
            <label>
              Fecha de vencimiento
              <input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
              />
            </label>
            <label>
              Estado
              <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                {INVOICE_ESTADOS.filter((e) => e.value !== 'anulada').map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Descuento (RD$)
              <input
                type="number"
                min={0}
                step="0.01"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
              />
            </label>
            <label>
              Monto pagado
              <input
                type="number"
                min={0}
                step="0.01"
                value={montoPagado}
                onChange={(e) => setMontoPagado(e.target.value)}
              />
            </label>
            <label>
              Ejecutivo
              <input value={ejecutivo} onChange={(e) => setEjecutivo(e.target.value)} />
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
        </section>

        <section className="panel">
          <h2>Cliente</h2>
          <ClientFields value={clientForm} onChange={setClientForm} />
        </section>

        <section className="panel">
          <div className="panel-header-row">
            <h2>Ítems</h2>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setItems((p) => [...p, { ...emptyItem }])}
            >
              + Agregar ítem
            </button>
          </div>
          <table className="items-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const line = (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0);
                return (
                  <tr key={idx}>
                    <td>
                      <input
                        value={item.descripcion}
                        onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
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
                    <td>{formatMoney(line)}</td>
                    <td>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn-ghost btn-sm danger"
                          onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
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
          <div className="totals-block">
            <p>Subtotal: {formatMoney(totals.subtotal)}</p>
            {totals.descuento > 0 && <p>Descuento: −{formatMoney(totals.descuento)}</p>}
            <p>ITBIS: {formatMoney(totals.itbis)}</p>
            <p>
              <strong>Total: {formatMoney(totals.total)}</strong>
            </p>
          </div>
          <div className="tax-mode-row">
            <label>
              <input
                type="radio"
                checked={taxMode === 'exento'}
                onChange={() => setTaxMode('exento')}
              />{' '}
              Exento
            </label>
            <label>
              <input
                type="radio"
                checked={taxMode === 'gravado_auto'}
                onChange={() => setTaxMode('gravado_auto')}
              />{' '}
              ITBIS 18%
            </label>
            <label>
              <input
                type="radio"
                checked={taxMode === 'gravado_manual'}
                onChange={() => setTaxMode('gravado_manual')}
              />{' '}
              ITBIS manual
            </label>
            {taxMode === 'gravado_manual' && (
              <input
                type="number"
                min={0}
                max={100}
                value={itbisRate}
                onChange={(e) => setItbisRate(e.target.value)}
              />
            )}
          </div>
        </section>

        <section className="panel">
          <label>
            Notas
            <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </label>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {isEdit ? 'Guardar cambios' : 'Crear factura'}
          </button>
          <Link to={isEdit ? `/facturas/${id}` : '/facturas'} className="btn-ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
