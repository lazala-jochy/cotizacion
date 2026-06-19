import AppLoadingScreen from './AppLoadingScreen';

/**
 * Capa de carga con colores de marca.
 * - Con children: overlay sobre el contenedor (position relative).
 * - Sin children + fixed: cubre toda la pantalla (acciones globales).
 */
export default function LoadingOverlay({
  show = false,
  message = 'Cargando…',
  fixed = false,
  children,
}) {
  if (!show && !children) return null;

  const overlay = show ? (
    <div
      className={`loading-overlay${fixed ? ' loading-overlay--fixed' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <AppLoadingScreen message={message} variant="overlay" />
    </div>
  ) : null;

  if (!children) {
    return overlay;
  }

  return (
    <div className={`loading-overlay-host${fixed ? ' loading-overlay-host--fixed' : ''}`}>
      {children}
      {overlay}
    </div>
  );
}
