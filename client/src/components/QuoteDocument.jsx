import QuotePartyInfo from './QuotePartyInfo';
import { useAuth } from '../context/AuthContext';
import { quoteEstadoLabel } from '../constants/quoteEstados';
import {
  formatMoney,
  filterQuoteItems,
  lineItemTotal,
  buildTotalsRows,
  getDocumentTerms,
} from '../utils/quoteDocumentData';

/**
 * Documento de cotización (vista, impresión y base del PDF del servidor).
 */
export default function QuoteDocument({ quote, emisor }) {
  const { user } = useAuth();
  const items = filterQuoteItems(quote.items);
  const totals = buildTotalsRows(quote);
  const terms = getDocumentTerms(quote, user?.nombre);
  const emisorListo = emisor?.nombre?.trim();

  return (
    <article className="quote-document print-area">
      <header className="quote-doc-header">
        <div className="quote-emisor-info quote-emisor-info--stacked">
          {emisor?.logo && <img src={emisor.logo} alt="" className="quote-emisor-logo" />}
          <QuotePartyInfo
            nombre={emisor?.nombre || '— Sin configurar —'}
            rnc={emisor?.rnc}
            direccion={emisor?.direccion}
            telefono={emisor?.telefono}
            email={emisor?.email}
          />
        </div>
        <div className="quote-doc-meta">
          <h2>COTIZACIÓN</h2>
          <p>
            <strong>No.</strong> {quote.numero}
          </p>
          <p>
            <strong>Fecha:</strong> {quote.fecha}
          </p>
          <p>
            <strong>Válida por:</strong> {quote.validez_dias} días
          </p>
          <p>
            <strong>Estado:</strong> {quoteEstadoLabel(quote.estado)}
          </p>
        </div>
      </header>

      <section className="quote-client-block">
        <h3>Cliente</h3>
        <QuotePartyInfo
          nombre={quote.client_nombre}
          rnc={quote.client_rnc}
          direccion={quote.client_direccion}
          telefono={quote.client_telefono}
          email={quote.client_email}
        />
      </section>

      <table className="quote-items-doc">
        <thead>
          <tr>
            <th>Item</th>
            <th>Cantidad</th>
            <th>Descripción</th>
            <th>Precio unitario</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id ?? i}>
              <td>{i + 1}</td>
              <td>{item.cantidad}</td>
              <td>{item.descripcion}</td>
              <td>{formatMoney(item.precio_unitario)}</td>
              <td>{formatMoney(lineItemTotal(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="quote-doc-bottom">
        <div className="quote-doc-terms">
          <p>
            <span className="quote-doc-terms-label">Ejecutivo:</span> {terms.ejecutivo}
          </p>
          <p>
            <span className="quote-doc-terms-label">Condiciones:</span> {terms.condiciones}
          </p>
          <p>
            <span className="quote-doc-terms-label">Forma de pago:</span> {terms.formaPago}
          </p>
        </div>
        <div className="quote-doc-totals">
          {totals.map((row) => (
            <div
              key={row.label}
            className={row.grand ? 'grand-total' : undefined}
          >
            <span>{row.label}</span>
            <span>{formatMoney(row.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {quote.payments?.length > 0 && (
        <section className="quote-payments-doc">
          <h3>Historial de pagos</h3>
          <table className="quote-items-doc">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Método</th>
                <th>Referencia</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {quote.payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.fecha}</td>
                  <td>{p.metodo || '—'}</td>
                  <td>{p.referencia || '—'}</td>
                  <td>{formatMoney(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {quote.notas && (
        <section className="quote-notes">
          <h3>Notas</h3>
          <p>{quote.notas}</p>
        </section>
      )}

      {emisorListo && (
        <footer className="quote-doc-footer">
          <p>Gracias por su preferencia — {emisor.nombre}</p>
        </footer>
      )}
    </article>
  );
}
