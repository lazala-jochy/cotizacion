import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuoteConvertToInvoiceModal from './QuoteConvertToInvoiceModal';

/**
 * Convierte una cotización en factura fiscal (cotización intacta).
 */
export default function QuoteConvertToInvoiceButton({
  quoteId,
  quoteNumero,
  clientRnc,
  className = 'btn-primary btn-sm',
  label = 'Convertir a factura',
  onError,
}) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setModalOpen(true)}
      >
        {label}
      </button>

      <QuoteConvertToInvoiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        quoteId={quoteId}
        quoteNumero={quoteNumero}
        clientRnc={clientRnc}
        onConverted={(invoice) => {
          setModalOpen(false);
          navigate(`/facturas/${invoice.id}`);
        }}
        onError={onError}
      />
    </>
  );
}
