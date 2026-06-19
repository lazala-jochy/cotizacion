import { useRef, useState } from 'react';
import { IconUpload } from './icons';
import { SectionLoader } from '../loading';

export default function FileUploadZone({ onFile, loading, fileName, schema }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file && onFile) onFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const hasFile = Boolean(schema);

  return (
    <section className={`report-studio-upload${dragOver ? ' is-dragover' : ''}${hasFile ? ' has-file' : ''}`}>
      <div
        className="report-studio-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Seleccionar archivo Excel"
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          disabled={loading}
        />

        <div className="report-studio-dropzone-icon">
          <IconUpload />
        </div>

        {loading ? (
          <SectionLoader message="Analizando archivo…" />
        ) : hasFile ? (
          <>
            <p className="report-studio-dropzone-title">{fileName}</p>
            <p className="report-studio-dropzone-sub">Archivo cargado. Haga clic para reemplazar.</p>
          </>
        ) : (
          <>
            <p className="report-studio-dropzone-title">Arrastre su Excel aquí</p>
            <p className="report-studio-dropzone-sub">o haga clic para seleccionar · .xlsx, .xls, .csv</p>
          </>
        )}
      </div>
    </section>
  );
}
