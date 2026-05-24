import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [emisor, setEmisor] = useState(null);
  const [stats, setStats] = useState({ clients: 0, quotes: 0 });

  useEffect(() => {
    api.emisor().then(setEmisor).catch(console.error);
    Promise.all([api.clients.list(), api.quotes.list()])
      .then(([clients, quotes]) => setStats({ clients: clients.length, quotes: quotes.length }))
      .catch(console.error);
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Inicio</h1>
          <p>Gestiona cotizaciones y clientes de ALTITUDE CONSULTING</p>
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
        <div className="stat-card">
          <span className="stat-value">{stats.clients}</span>
          <span className="stat-label">Clientes</span>
        </div>
      </div>

      <div className="cards-row">
        <Link to="/cotizaciones/nueva" className="action-card">
          <h3>Nueva cotización</h3>
          <p>Crea una cotización con datos del cliente e ítems.</p>
        </Link>
        <Link to="/clientes" className="action-card">
          <h3>Ver clientes</h3>
          <p>Administra tu cartera de clientes guardados.</p>
        </Link>
      </div>

      {emisor && (
        <section className="panel emisor-panel">
          <h2>Emisor</h2>
          <dl className="emisor-dl">
            <div>
              <dt>Empresa</dt>
              <dd>{emisor.nombre}</dd>
            </div>
            <div>
              <dt>RNC</dt>
              <dd>{emisor.rnc}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd>{emisor.direccion}</dd>
            </div>
            <div>
              <dt>Tel.</dt>
              <dd>{emisor.telefono}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{emisor.email}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
