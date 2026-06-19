import SignaturePad from '../SignaturePad';
import EmisorImageUpload from '../EmisorImageUpload';

export default function EmisorFirmaSection({ form, setForm, setError, onSubmit, saving }) {
  return (
    <section className="panel" id="firma">
      <h2>Firma y sello</h2>
      <p className="muted settings-section-lead">
        Se muestran en el PDF de la cotización si agregas los elementos <strong>Firma</strong> y{' '}
        <strong>Sello</strong> en tu plantilla.
      </p>
      <form onSubmit={onSubmit} className="form-grid emisor-form">
        <div className="span-2">
          <span className="field-label-block">Firma</span>
          <p className="muted signature-pad-hint">
            Dibuje la firma aquí o suba una imagen. Si hay imagen de firma, se usa en el PDF en lugar
            del texto.
          </p>
          <SignaturePad
            value={form.firma}
            onChange={(firma) => setForm((f) => ({ ...f, firma }))}
          />
        </div>
        <EmisorImageUpload
          label="O subir imagen de firma"
          value={form.firma}
          onChange={(firma) => setForm((f) => ({ ...f, firma }))}
          onError={setError}
          previewClassName="signature-upload-preview"
        />
        <EmisorImageUpload
          label="Sello de la empresa"
          hint="Imagen del sello (PNG con fondo transparente recomendado), máx. 2 MB"
          value={form.sello}
          onChange={(sello) => setForm((f) => ({ ...f, sello }))}
          onError={setError}
          previewClassName="sello-upload-preview"
        />
        <div className="form-actions span-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            Guardar firma y sello
          </button>
        </div>
      </form>
    </section>
  );
}
