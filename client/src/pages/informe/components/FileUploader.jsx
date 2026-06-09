export default function FileUploader({ fileName, sheetCount, loading, onPick, onClear }) {
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file?.path) onPick(file.path, file.name);
  };

  const handleInput = (e) => {
    const file = e.target.files?.[0];
    if (file?.path) onPick(file.path, file.name);
    e.target.value = '';
  };

  return (
    <section className="panel informe-xl-upload">
      <div
        className={`informe-xl-dropzone${loading ? ' is-loading' : ''}${fileName ? ' has-file' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !loading && document.getElementById('informe-xl-input')?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('informe-xl-input')?.click()}
      >
        <input id="informe-xl-input" type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleInput} />
        <div className="informe-xl-dropzone-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V4m0 0L7 9m5-5 5 5M4 20h16"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </div>
        {loading ? (
          <>
            <p className="informe-xl-dropzone-title">Leyendo archivo…</p>
            <p className="muted">Detectando hojas y columnas</p>
          </>
        ) : fileName ? (
          <>
            <p className="informe-xl-dropzone-title">{fileName}</p>
            <p className="muted">
              {sheetCount} hoja(s) detectada(s) · Clic para cambiar archivo
            </p>
          </>
        ) : (
          <>
            <p className="informe-xl-dropzone-title">Arrastre su Excel aquí</p>
            <p className="muted">o haga clic para seleccionar · .xlsx, .xls</p>
          </>
        )}
      </div>
      {fileName && !loading && (
        <button type="button" className="btn-ghost btn-sm informe-xl-clear" onClick={onClear}>
          Quitar archivo
        </button>
      )}
    </section>
  );
}
