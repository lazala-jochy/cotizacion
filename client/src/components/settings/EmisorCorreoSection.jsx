export default function EmisorCorreoSection({
  form,
  setForm,
  showSmtpPassword,
  setShowSmtpPassword,
  onSubmit,
  saving,
}) {
  return (
    <section className="panel" id="correo">
      <h2>Envío por Gmail</h2>
      <p className="muted settings-section-lead">
        Credenciales para enviar cotizaciones y facturas por correo desde la aplicación.
      </p>
      <form onSubmit={onSubmit} className="form-grid emisor-form">
        <p className="muted span-2">
          Si tienes verificación en dos pasos, usa una{' '}
          <a
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noopener noreferrer"
          >
            contraseña de aplicación
          </a>
          .
        </p>
        <label>
          Usuario (correo Gmail)
          <input
            type="email"
            value={form.smtp_user}
            onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
            autoComplete="username"
          />
        </label>
        <label>
          Contraseña
          <div className="password-field-wrap">
            <input
              type={showSmtpPassword ? 'text' : 'password'}
              value={form.smtp_password}
              onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-ghost btn-sm btn-password-toggle"
              onClick={() => setShowSmtpPassword((v) => !v)}
            >
              {showSmtpPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </label>
        <div className="form-actions span-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            Guardar correo
          </button>
        </div>
      </form>
    </section>
  );
}
