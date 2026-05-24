import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { downloadInvoicePdf } from '../utils/downloadInvoicePdf';

function formatMoney(n) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n || 0);
}

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    api.quotes
      .list()
      .then(setQuotes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadPdf = async (q) => {
    setDownloadingId(q.id);
    setError('');
    try {
      await downloadInvoicePdf(q.id, q.numero);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    try {
      await api.quotes.remove(id);
      setQuotes((q) => q.filter((x) => x.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Cotizaciones</h1>
          <p>Listado de cotizaciones generadas</p>
        </div>
        <Link to="/cotizaciones/nueva" className="btn-primary">
          + Nueva cotización
        </Link>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="panel">
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : quotes.length === 0 ? (
          <p className="muted">No hay cotizaciones aún.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link to={`/cotizaciones/${q.id}`}>{q.numero}</Link>
                  </td>
                  <td>{q.client_nombre}</td>
                  <td>{q.fecha}</td>
                  <td>{formatMoney(q.total)}</td>
                  <td>
                    <span className={`badge badge-${q.estado}`}>{q.estado}</span>
                  </td>
                  <td className="actions">
                    <Link to={`/cotizaciones/${q.id}`} className="btn-ghost btn-sm">
                      Ver
                    </Link>
                    <Link to={`/cotizaciones/${q.id}/editar`} className="btn-ghost btn-sm">
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => handleDownloadPdf(q)}
                      disabled={downloadingId === q.id}
                      title="Descargar factura PDF"
                    >
                      {downloadingId === q.id ? 'PDF…' : 'Factura PDF'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm danger"
                      onClick={() => handleDelete(q.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
