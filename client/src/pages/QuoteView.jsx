import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { downloadInvoicePdf } from '../utils/downloadInvoicePdf';
import { canEditQuoteContent } from '../constants/quoteEstados';
import QuoteWorkflow from '../components/QuoteWorkflow';
import QuoteDocument from '../components/QuoteDocument';
import QuoteSendEmailModal from '../components/QuoteSendEmailModal';
import QuoteDownloadOptionsModal from '../components/QuoteDownloadOptionsModal';
import QuoteConvertToInvoiceButton from '../components/QuoteConvertToInvoiceButton';
import QuoteExpensesSection from '../components/finance/QuoteExpensesSection';
import ProfitabilityPanel from '../components/finance/ProfitabilityPanel';
import { PageLoader } from '../components/loading';
import LoadingOverlay from '../components/LoadingOverlay';

export default function QuoteView() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const [emisor, setEmisor] = useState(null);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const load = () =>
    Promise.all([api.quotes.get(id), api.emisor.get()])
      .then(([q, e]) => {
        setQuote(q);
        setEmisor(e);
      })
      .catch((e) => setError(e.message));

  const refreshProfitability = () => {
    api.quotes.get(id).then(setQuote).catch(() => {});
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleDownloadPdf = async (includeSignature) => {
    setPdfLoading(true);
    setError('');
    try {
      await downloadInvoicePdf(id, quote?.numero, { includeSignature });
      setDownloadModalOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  if (error && !quote) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!quote || emisor === null) {
    return (
      <div className="page">
        <PageLoader message="Cargando cotización…" />
      </div>
    );
  }

  const emisorListo = emisor?.nombre?.trim();
  const editable = canEditQuoteContent(quote.estado);

  return (
    <>
      <LoadingOverlay show={pdfLoading} fixed message="Generando PDF…" />
      <div className="page quote-view-page">
      <div className="no-print quote-view-toolbar">
        <Link to="/cotizaciones" className="btn-ghost btn-sm">
          ← Volver
        </Link>
        <div className="quote-view-toolbar-actions">
          {editable && (
            <Link to={`/cotizaciones/${id}/editar`} className="btn-ghost btn-sm">
              Editar
            </Link>
          )}
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setDownloadModalOpen(true)}
            disabled={pdfLoading}
          >
            Descargar PDF
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => {
              setSendSuccess('');
              setError('');
              setSendModalOpen(true);
            }}
          >
            Enviar por correo
          </button>
          <QuoteConvertToInvoiceButton
            quoteId={id}
            quoteNumero={quote?.numero}
            clientRnc={quote?.client_rnc}
            className="btn-primary btn-sm"
            onError={setError}
          />
        </div>
      </div>

      <section className="panel quote-convert-banner no-print" aria-label="Facturación">
        <div className="quote-convert-banner-text">
          <strong>Facturación</strong>
          <p className="muted">
            Emite una factura fiscal con los mismos datos de esta cotización. La cotización{' '}
            <strong>{quote.numero}</strong> permanece sin cambios.
          </p>
        </div>
        <QuoteConvertToInvoiceButton
          quoteId={id}
          quoteNumero={quote.numero}
          clientRnc={quote.client_rnc}
          className="btn-primary"
          onError={setError}
        />
      </section>

      {sendSuccess && <div className="alert alert-success no-print">{sendSuccess}</div>}
      {error && <div className="alert alert-error no-print">{error}</div>}

      <QuoteDownloadOptionsModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        onChoose={handleDownloadPdf}
        busy={pdfLoading}
      />

      {sendModalOpen && (
        <QuoteSendEmailModal
          quote={quote}
          onClose={() => setSendModalOpen(false)}
          onSent={(updated) => {
            if (updated) setQuote(updated);
            setSendSuccess('Cotización enviada por correo correctamente.');
            setSendModalOpen(false);
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

      <ProfitabilityPanel profitability={quote.profitability} title="Rentabilidad de la cotización" />

      <QuoteExpensesSection
        quoteId={id}
        clientId={quote.client_id}
        clientRnc={quote.client_rnc}
        onChanged={refreshProfitability}
      />

      <QuoteDocument quote={quote} emisor={emisor} />
    </div>
    </>
  );
}
