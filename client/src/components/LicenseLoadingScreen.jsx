export default function LicenseLoadingScreen({ message = 'Verificando licencia…' }) {
  return (
    <div className="license-loading-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="license-loading-card">
        <div className="license-loading-spinner" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h1 className="license-loading-title">Lazala Cotizaciones</h1>
        <p className="license-loading-message">{message}</p>
        <ul className="license-loading-steps">
          <li className="license-loading-step license-loading-step--active">Conectando con el servidor</li>
          <li className="license-loading-step">Consultando product key</li>
          <li className="license-loading-step">Cargando módulos permitidos</li>
        </ul>
      </div>
    </div>
  );
}
