import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { downloadFacturaPdf } from '../utils/downloadFacturaPdf';
import { invoiceEstadoLabel, canEditInvoice } from '../constants/invoiceEstados';
import InvoiceDocument from '../components/InvoiceDocument';
import InvoiceSendEmailModal from '../components/InvoiceSendEmailModal';
import InvoiceAnnulModal from '../components/InvoiceAnnulModal';
import ConfirmModal from '../components/ConfirmModal';
import InvoiceExpensesSection from '../components/finance/InvoiceExpensesSection';
import ProfitabilityPanel from '../components/finance/ProfitabilityPanel';

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n || 0);
}

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

export default function InvoiceView() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [annulModalOpen, setAnnulModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = () =>
    Promise.all([api.invoices.get(id), api.invoices.audit(id)])
      .then(([inv, log]) => {
        setInvoice(inv);
        setAudit(log);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    if (location.state?.invoice?.id === Number(id)) {
      setInvoice(location.state.invoice);
      api.invoices.audit(id).then(setAudit).catch(() => {});
      return;
    }
    load();
  }, [id, location.state]);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    setError('');
    try {
      await downloadFacturaPdf(id, invoice?.fiscal_number);
    } catch (e) {
      setError(e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleAnnulled = async (updated) => {
    setInvoice(updated);
    await load();
  };

  const handleConfirmDelete = async () => {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await api.invoices.remove(id);
      navigate('/facturas');
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  if (error && !invoice) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }
  if (!invoice) return <div className="page"><p className="muted">Cargando…</p></div>;

  const editable = canEditInvoice(invoice.estado);

  return (
    <div className="page quote-view-page">
      <div className="no-print quote-view-toolbar">
        <Link to="/facturas" className="btn-ghost btn-sm">
          ← Volver
        </Link>
        <div className="quote-view-toolbar-actions">
          {editable && (
            <Link to={`/facturas/${id}/editar`} className="btn-ghost btn-sm">
              Editar
            </Link>
          )}
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? 'Generando PDF…' : 'Descargar PDF'}
          </button>
          {invoice.estado !== 'anulada' && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => {
                setSendSuccess('');
                setSendModalOpen(true);
              }}
            >
              Enviar por correo
            </button>
          )}
          {editable && invoice.estado !== 'anulada' && (
            <button
              type="button"
              className="btn-ghost btn-sm danger"
              onClick={() => setAnnulModalOpen(true)}
            >
              Anular
            </button>
          )}
          {invoice.estado === 'anulada' && (
            <button
              type="button"
              className="btn-ghost btn-sm danger"
              onClick={() => {
                setDeleteError('');
                setDeleteConfirmOpen(true);
              }}
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      {sendSuccess && <div className="alert alert-success no-print">{sendSuccess}</div>}
      {error && <div className="alert alert-error no-print">{error}</div>}

      <InvoiceAnnulModal
        invoice={invoice}
        open={annulModalOpen}
        onClose={() => setAnnulModalOpen(false)}
        onAnnulled={handleAnnulled}
      />

      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => !deleteBusy && setDeleteConfirmOpen(false)}
        title="Eliminar factura"
        subtitle={invoice.fiscal_number}
        titleId="delete-invoice-view-title"
        confirmLabel={deleteBusy ? 'Eliminando…' : 'Eliminar permanentemente'}
        onConfirm={handleConfirmDelete}
        busy={deleteBusy}
        error={deleteError}
        confirmVariant="danger"
      >
        <p className="app-modal-message">
          Se borrará la factura anulada <strong>{invoice.fiscal_number}</strong> de forma permanente.
          Esta acción no se puede deshacer.
        </p>
      </ConfirmModal>

      {sendModalOpen && (
        <InvoiceSendEmailModal
          invoice={invoice}
          onClose={() => setSendModalOpen(false)}
          onSent={(updated) => {
            if (updated) setInvoice(updated);
            setSendSuccess('Factura enviada por correo correctamente.');
            setSendModalOpen(false);
            load();
          }}
        />
      )}

      <section className="panel no-print" style={{ marginBottom: '1rem' }}>
        <h2>Factura {invoice.fiscal_number}</h2>
        <dl className="detail-dl">
          <dt>Referencia interna</dt>
          <dd>{invoice.numero}</dd>
          <dt>Estado</dt>
          <dd>{invoiceEstadoLabel(invoice.estado)}</dd>
          <dt>Cliente</dt>
          <dd>{invoice.client_nombre}</dd>
          <dt>RNC / Cédula</dt>
          <dd>{invoice.client_rnc || '—'}</dd>
          <dt>Emisión</dt>
          <dd>{formatDate(invoice.fecha_emision)}</dd>
          <dt>Vencimiento</dt>
          <dd>{formatDate(invoice.fecha_vencimiento)}</dd>
          <dt>Total</dt>
          <dd>{formatMoney(invoice.total)}</dd>
          {invoice.quote_id && (
            <>
              <dt>Cotización origen</dt>
              <dd>
                <Link to={`/cotizaciones/${invoice.quote_id}`}>
                  {invoice.quote_numero || `#${invoice.quote_id}`}
                </Link>
              </dd>
            </>
          )}
        </dl>
      </section>

      <ProfitabilityPanel profitability={invoice.profitability} title="Rentabilidad de la factura" />

      <InvoiceExpensesSection
        invoiceId={id}
        onChanged={() => api.invoices.get(id).then(setInvoice)}
      />

      <InvoiceDocument invoice={invoice} />

      {audit.length > 0 && (
        <section className="panel no-print" style={{ marginTop: '1.5rem' }}>
          <h3>Historial</h3>
          <ul className="audit-list">
            {audit.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.action}</strong> — {entry.user_nombre || 'Usuario'} —{' '}
                {new Date(entry.created_at).toLocaleString('es-DO')}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
