export default function AppLoadingScreen({
  message = 'Cargando…',
  variant = 'page',
}) {
  return (
    <div
      className={['app-loading-screen', `app-loading-screen--${variant}`].join(' ')}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="app-loading-content">
        <div className="app-loading-mark" aria-hidden="true">
          <span className="app-loading-ring" />
          <span className="app-loading-pixels">
            <span />
            <span />
            <span />
          </span>
        </div>
        {message ? <p className="app-loading-message">{message}</p> : null}
      </div>
    </div>
  );
}
