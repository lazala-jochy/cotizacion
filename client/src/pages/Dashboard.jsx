import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [emisor, setEmisor] = useState(null);
  const [stats, setStats] = useState({ quotes: 0 });
  const emisorConfigured = emisor?.nombre?.trim();

  useEffect(() => {
    api.emisor.get().then(setEmisor).catch(console.error);
    api.quotes
      .list()
      .then((quotes) => setStats({ quotes: quotes.length }))
      .catch(console.error);
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Inicio</h1>
          <p>Gestiona cotizaciones con los datos del cliente en cada una</p>
        </div>
        <Link to="/cotizaciones/nueva" className="btn-primary">
          + Nueva cotización
        </Link>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.quotes}</span>
          <span className="stat-label">Cotizaciones</span>
        </div>
      </div>

      <div className="cards-row">
        <Link to="/cotizaciones/nueva" className="action-card">
          <h3>Nueva cotización</h3>
          <p>Crea una cotización con datos del cliente e ítems.</p>
        </Link>
        <Link to="/cotizaciones" className="action-card">
          <h3>Ver cotizaciones</h3>
          <p>Consulta y administra todas tus cotizaciones.</p>
        </Link>
        <Link to="/reportes" className="action-card">
          <h3>Reportes</h3>
          <p>Gráficos de ventas, estados y clientes principales.</p>
        </Link>
      </div>

      {!emisorConfigured && (
        <div className="alert alert-warn">
          Configura los datos de tu empresa en{' '}
          <Link to="/configuracion">Empresa</Link> para que aparezcan en las cotizaciones.
        </div>
      )}

      {emisorConfigured && (
        <section className="panel emisor-panel">
          <div className="panel-header-row">
            <h2>Mi empresa</h2>
            <Link to="/configuracion" className="btn-ghost btn-sm">
              Editar
            </Link>
          </div>
          <dl className="emisor-dl">
            <div>
              <dt>Empresa</dt>
              <dd className="text-break">{emisor.nombre}</dd>
            </div>
            <div>
              <dt>RNC</dt>
              <dd className="text-break">{emisor.rnc}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd className="text-break">{emisor.direccion}</dd>
            </div>
            <div>
              <dt>Tel.</dt>
              <dd className="text-break">{emisor.telefono}</dd>
            </div>
            <div className="emisor-dl-email">
              <dt>Email</dt>
              <dd className="text-break">
                <a href={`mailto:${emisor.email}`}>{emisor.email}</a>
              </dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
