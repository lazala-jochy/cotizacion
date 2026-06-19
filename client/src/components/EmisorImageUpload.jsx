const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export default function EmisorImageUpload({
  label,
  hint = 'PNG o JPG, máx. 2 MB',
  value,
  onChange,
  onError,
  accept = 'image/png,image/jpeg,image/jpg,image/webp',
  previewClassName = '',
}) {
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError?.('El archivo debe ser una imagen');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onError?.('La imagen no puede superar 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result);
      onError?.('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <label className="emisor-image-upload span-2">
      <span>{label}</span>
      <div className="logo-upload-box">
        {value && (
          <div className={`logo-preview-wrap ${previewClassName}`.trim()}>
            <img src={value} alt="" />
            <button type="button" className="btn-ghost btn-sm" onClick={() => onChange(null)}>
              Quitar imagen
            </button>
          </div>
        )}
        {!value && <p className="logo-hint">{hint}</p>}
        <input type="file" accept={accept} onChange={handleFile} />
      </div>
    </label>
  );
}
