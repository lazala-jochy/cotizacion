import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n || 0);
}

export default function QuoteView() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const [emisor, setEmisor] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.quotes.get(id), api.emisor()])
      .then(([q, e]) => {
        setQuote(q);
        setEmisor(e);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const handlePrint = () => {
    if (window.electronAPI?.printQuote) {
      window.electronAPI.printQuote();
    } else {
      window.print();
    }
  };

  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!quote || !emisor) return <div className="page"><p className="muted">Cargando…</p></div>;

  return (
    <div className="page quote-view-page">
      <div className="no-print toolbar">
        <Link to="/cotizaciones" className="btn-ghost">
          ← Volver
        </Link>
        <div className="toolbar-actions">
          <Link to={`/cotizaciones/${id}/editar`} className="btn-ghost">
            Editar
          </Link>
          <button type="button" className="btn-primary" onClick={handlePrint}>
            Imprimir / PDF
          </button>
        </div>
      </div>

      <article className="quote-document print-area">
        <header className="quote-doc-header">
          <div>
            <h1>{emisor.nombre}</h1>
            <p>RNC {emisor.rnc}</p>
            <p>{emisor.direccion}</p>
            <p>
              Tel. {emisor.telefono} · {emisor.email}
            </p>
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
            <span className={`badge badge-${quote.estado}`}>{quote.estado}</span>
          </div>
        </header>

        <section className="quote-client-block">
          <h3>Cliente</h3>
          <p>
            <strong>{quote.client_nombre}</strong>
          </p>
          {quote.client_rnc && <p>RNC: {quote.client_rnc}</p>}
          {quote.client_direccion && <p>{quote.client_direccion}</p>}
          {(quote.client_telefono || quote.client_email) && (
            <p>
              {quote.client_telefono}
              {quote.client_telefono && quote.client_email && ' · '}
              {quote.client_email}
            </p>
          )}
        </section>

        <table className="quote-items-doc">
          <thead>
            <tr>
              <th>#</th>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>P. unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>{item.descripcion}</td>
                <td>{item.cantidad}</td>
                <td>{formatMoney(item.precio_unitario)}</td>
                <td>{formatMoney(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="quote-doc-totals">
          <div>
            <span>Subtotal</span>
            <span>{formatMoney(quote.subtotal)}</span>
          </div>
          {quote.itbis > 0 && (
            <div>
              <span>ITBIS (18%)</span>
              <span>{formatMoney(quote.itbis)}</span>
            </div>
          )}
          <div className="grand-total">
            <span>Total</span>
            <span>{formatMoney(quote.total)}</span>
          </div>
        </div>

        {quote.notas && (
          <section className="quote-notes">
            <h3>Notas</h3>
            <p>{quote.notas}</p>
          </section>
        )}

        <footer className="quote-doc-footer">
          <p>Gracias por su preferencia — {emisor.nombre}</p>
        </footer>
      </article>
    </div>
  );
}
