import LoadingOverlay from '../LoadingOverlay';

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

export default function UploadDataset({ onAnalyzed, loading, error }) {
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onAnalyzed) return;
    try {
      const contentBase64 = await readFileAsBase64(file);
      await onAnalyzed({ fileName: file.name, contentBase64 });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <LoadingOverlay show={loading} message="Analizando archivo…">
      <section className="panel report-builder-upload">
        <h2 className="panel-title">Cargar dataset</h2>
        <p className="muted">
          Excel, CSV u hojas tabulares. El sistema detectará columnas, tipos y hojas automáticamente.
        </p>
        <label className="report-builder-file-label">
          <span className="btn-primary">Seleccionar archivo</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={handleFile}
            disabled={loading}
          />
        </label>
        {error && <p className="alert alert-error">{error}</p>}
      </section>
    </LoadingOverlay>
  );
}
