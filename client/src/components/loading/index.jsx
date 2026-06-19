import AppLoadingScreen from '../AppLoadingScreen';

export { default as AppLoadingScreen } from '../AppLoadingScreen';
export { default as LoadingOverlay } from '../LoadingOverlay';

export function PageLoader({ message = 'Cargando…' }) {
  return <AppLoadingScreen message={message} variant="page" />;
}

export function SectionLoader({ message = 'Cargando…' }) {
  return <AppLoadingScreen message={message} variant="section" />;
}
