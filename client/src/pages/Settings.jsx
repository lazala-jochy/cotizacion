import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useLicense } from '../context/LicenseContext';
import FiscalSettingsSection from '../components/FiscalSettingsSection';
import LicenseSettingsSection from '../components/LicenseSettingsSection';
import LoadingOverlay from '../components/LoadingOverlay';
import { PageLoader } from '../components/loading';
import SettingsNav, { settingsSectionVisible } from '../components/settings/SettingsNav';
import EmisorGeneralSection from '../components/settings/EmisorGeneralSection';
import EmisorFirmaSection from '../components/settings/EmisorFirmaSection';
import EmisorCorreoSection from '../components/settings/EmisorCorreoSection';

const emptyEmisor = {
  nombre: '',
  rnc: '',
  direccion: '',
  telefono: '',
  email: '',
  logo: null,
  firma: null,
  sello: null,
  mensaje_pdf: '',
  smtp_user: '',
  smtp_password: '',
  smtp_configured: false,
};

export default function Settings() {
  const { hasModule } = useLicense();
  const { hash } = useLocation();
  const [form, setForm] = useState(emptyEmisor);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  useEffect(() => {
    api.emisor
      .get()
      .then((data) => setForm({ ...emptyEmisor, ...data }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.smtp_configured;
      if (payload.smtp_password !== undefined) {
        payload.smtp_password = String(payload.smtp_password);
      }
      const saved = await api.emisor.update(payload);
      setForm({ ...emptyEmisor, ...saved });
      setSuccess('Cambios guardados correctamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <PageLoader message="Cargando datos de la empresa…" />
      </div>
    );
  }

  const showEmpresa = settingsSectionVisible(hash, 'empresa');
  const showFirma = settingsSectionVisible(hash, 'firma');
  const showCorreo = settingsSectionVisible(hash, 'correo');
  const showLicencia = settingsSectionVisible(hash, 'licencia');
  const showFiscal = settingsSectionVisible(hash, 'fiscal');

  return (
    <>
      <LoadingOverlay show={saving} fixed message="Guardando…" />
      <div className="page settings-page">
        <header className="page-header">
          <div>
            <h1>Empresa</h1>
            <p>Configuración de la empresa, firma, correo, licencia y datos fiscales.</p>
          </div>
          {hasModule('plantillas') && (
            <Link to="/plantillas" className="btn-primary">
              Diseñador de plantillas
            </Link>
          )}
        </header>

        <SettingsNav />

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {showEmpresa && (
          <EmisorGeneralSection
            form={form}
            setForm={setForm}
            setError={setError}
            onSubmit={handleSubmit}
            saving={saving}
          />
        )}

        {showFirma && (
          <EmisorFirmaSection
            form={form}
            setForm={setForm}
            setError={setError}
            onSubmit={handleSubmit}
            saving={saving}
          />
        )}

        {showCorreo && (
          <EmisorCorreoSection
            form={form}
            setForm={setForm}
            showSmtpPassword={showSmtpPassword}
            setShowSmtpPassword={setShowSmtpPassword}
            onSubmit={handleSubmit}
            saving={saving}
          />
        )}

        {showLicencia && <LicenseSettingsSection />}

        {showFiscal && <FiscalSettingsSection />}
      </div>
    </>
  );
}
