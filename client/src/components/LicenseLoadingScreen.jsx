import AppLoadingScreen from './AppLoadingScreen';

export default function LicenseLoadingScreen({ message = 'Cargando información de licencia…' }) {
  return <AppLoadingScreen message={message} variant="section" />;
}
