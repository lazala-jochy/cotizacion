import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { downloadInvoicePdf } from '../utils/downloadInvoicePdf';
import { canEditQuoteContent } from '../constants/quoteEstados';
import QuoteWorkflow from '../components/QuoteWorkflow';
import QuoteDocument from '../components/QuoteDocument';
import QuoteSendEmailModal from '../components/QuoteSendEmailModal';

export default function QuoteView() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const [emisor, setEmisor] = useState(null);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');

  const load = () =>
    Promise.all([api.quotes.get(id), api.emisor.get()])
      .then(([q, e]) => {
        setQuote(q);
        setEmisor(e);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [id]);

  const handlePrint = () => {
    if (window.electronAPI?.printQuote) {
      window.electronAPI.printQuote();
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    setError('');
    try {
      await downloadInvoicePdf(id, quote?.numero);
    } catch (e) {
      setError(e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  if (error && !quote) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!quote || emisor === null) return <div className="page"><p className="muted">Cargando…</p></div>;

  const emisorListo = emisor?.nombre?.trim();
  const editable = canEditQuoteContent(quote.estado);

  return (
    <div className="page quote-view-page">
      <div className="no-print toolbar">
        <Link to="/cotizaciones" className="btn-ghost">
          ← Volver
        </Link>
        <div className="toolbar-actions">
          {editable && (
            <Link to={`/cotizaciones/${id}/editar`} className="btn-ghost">
              Editar
            </Link>
          )}
          <button type="button" className="btn-ghost" onClick={handlePrint}>
            Imprimir
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setEmailSuccess('');
              setError('');
              setEmailModalOpen(true);
            }}
          >
            Enviar por correo
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? 'Generando PDF…' : 'Descargar cotización PDF'}
          </button>
        </div>
      </div>

      {emailSuccess && <div className="alert alert-success no-print">{emailSuccess}</div>}
      {error && <div className="alert alert-error no-print">{error}</div>}

      {emailModalOpen && (
        <QuoteSendEmailModal
          quote={quote}
          onClose={() => setEmailModalOpen(false)}
          onSent={(updated) => {
            setQuote(updated);
            setEmailSuccess(`Cotización enviada correctamente.`);
          }}
        />
      )}

      {!emisorListo && (
        <div className="alert alert-warn no-print">
          Configura los datos de tu empresa en <Link to="/configuracion">Empresa</Link> para mostrarlos en la
          cotización impresa.
        </div>
      )}

      <QuoteWorkflow quote={quote} onUpdate={setQuote} />

      <QuoteDocument quote={quote} emisor={emisor} />
    </div>
  );
}
