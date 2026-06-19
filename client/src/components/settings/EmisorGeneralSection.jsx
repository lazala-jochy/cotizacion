import EmisorImageUpload from '../EmisorImageUpload';

export default function EmisorGeneralSection({ form, setForm, setError, onSubmit, saving }) {
  return (
    <section className="panel" id="empresa">
      <h2>Datos de la empresa</h2>
      <p className="muted settings-section-lead">
        Razón social, logo y datos de contacto que aparecen en cotizaciones y facturas.
      </p>
      <form onSubmit={onSubmit} className="form-grid emisor-form">
        <label>
          Nombre / razón social *
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Mi Empresa SRL"
            required
          />
        </label>
        <label>
          RNC
          <input
            value={form.rnc}
            onChange={(e) => setForm({ ...form, rnc: e.target.value })}
            placeholder="Ej: 04900920846"
          />
        </label>
        <EmisorImageUpload
          label="Logo"
          value={form.logo}
          onChange={(logo) => setForm((f) => ({ ...f, logo }))}
          onError={setError}
        />
        <label className="span-2">
          Dirección
          <input
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />
        </label>
        <label>
          Teléfono
          <input
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="span-2">
          Mensaje para PDF
          <span className="field-hint muted">
            Texto opcional en cotizaciones (ej. agradecimiento). Agrégalo en la plantilla con el
            elemento «Mensaje personalizado».
          </span>
          <textarea
            rows={3}
            value={form.mensaje_pdf || ''}
            onChange={(e) => setForm({ ...form, mensaje_pdf: e.target.value })}
            placeholder="Ej.: Gracias por confiar en nuestro equipo."
          />
        </label>
        <div className="form-actions span-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            Guardar empresa
          </button>
        </div>
      </form>
    </section>
  );
}
