import { useCallback, useState } from 'react';
import FileUploader from './components/FileUploader';
import SheetSelector from './components/SheetSelector';
import SectionBuilder from './components/SectionBuilder';
import ReportPreview from './components/ReportPreview';
import { createInitialState } from './defaultState';
import {
  isInformeElectron,
  readExcel,
  previewData,
  generateReport,
} from './informeApi';

const STEPS = ['Archivo', 'Hojas', 'Secciones', 'Preview'];

function getStep(state) {
  if (!state.filePath) return 0;
  const { gastosSheet, ventasSheet, columnMap } = state;
  const gastosOk = gastosSheet && columnMap.gastos?.proveedor && columnMap.gastos?.monto;
  const ventasOk =
    ventasSheet &&
    columnMap.ventas?.producto &&
    columnMap.ventas?.cantidad &&
    columnMap.ventas?.total;
  if (!gastosOk || !ventasOk) return 1;
  return 2;
}

export default function InformePage() {
  const [state, setState] = useState(createInitialState);
  const [error, setError] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const config = {
    gastosSheet: state.gastosSheet,
    ventasSheet: state.ventasSheet,
    columnMap: state.columnMap,
  };

  const loadFile = useCallback(async (filePath, fileName) => {
    if (!isInformeElectron()) {
      setError('Este módulo solo está disponible en la aplicación de escritorio.');
      return;
    }
    setError('');
    setLoadingFile(true);
    try {
      const meta = await readExcel(filePath);
      setState((prev) => ({
        ...createInitialState(),
        filePath,
        fileName: fileName || filePath.split(/[/\\]/).pop(),
        sheets: meta.sheets || [],
        gastosSheet: meta.sheets?.[0]?.name || null,
        ventasSheet: meta.sheets?.[1]?.name || meta.sheets?.[0]?.name || null,
      }));
    } catch (err) {
      setError(err.message || 'No se pudo leer el archivo');
    } finally {
      setLoadingFile(false);
    }
  }, []);

  const refreshPreview = useCallback(async () => {
    if (!state.filePath) return;
    setError('');
    setLoadingPreview(true);
    try {
      const data = await previewData({
        filePath: state.filePath,
        config,
        sections: state.sections,
      });
      setState((prev) => ({ ...prev, previewData: data }));
    } catch (err) {
      setError(err.message || 'No se pudo calcular la vista previa');
    } finally {
      setLoadingPreview(false);
    }
  }, [state.filePath, state.sections, config]);

  const handleGenerate = async () => {
    if (!state.filePath) return;
    setError('');
    setState((prev) => ({ ...prev, generating: true }));
    try {
      let preview = state.previewData;
      if (!preview) {
        preview = await previewData({
          filePath: state.filePath,
          config,
          sections: state.sections,
        });
        setState((prev) => ({ ...prev, previewData: preview }));
      }

      const result = await generateReport({
        filePath: state.filePath,
        config,
        sections: state.sections,
        title: `INFORME — ${state.fileName || 'Reporte'}`,
      });

      if (result.canceled) return;
      if (!result.success) {
        throw new Error(result.error || 'No se pudo generar el informe');
      }
    } catch (err) {
      setError(err.message || 'Error al generar');
    } finally {
      setState((prev) => ({ ...prev, generating: false }));
    }
  };

  const currentStep = state.previewData ? 3 : getStep(state);

  if (!isInformeElectron()) {
    return (
      <div className="page informe-xl-page">
        <header className="informe-xl-hero">
          <p className="informe-xl-eyebrow">Informe Excel</p>
          <h1>Informe</h1>
          <p className="muted">Abra esta función desde la aplicación de escritorio Cotizaciones.</p>
        </header>
      </div>
    );
  }

  return (
    <div className="page informe-xl-page">
      <header className="informe-xl-hero">
        <p className="informe-xl-eyebrow">Generador de informes</p>
        <h1>Informe</h1>
        <p>Cargue un Excel, configure secciones y genere un reporte formateado profesional.</p>
      </header>

      <nav className="informe-xl-steps" aria-label="Pasos">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`informe-xl-step${i === currentStep ? ' is-current' : ''}${i < currentStep ? ' is-done' : ''}`}
          >
            <span className="informe-xl-step-num">{i + 1}</span>
            <span>{label}</span>
          </div>
        ))}
      </nav>

      {error && <div className="alert alert-error">{error}</div>}

      <FileUploader
        fileName={state.fileName}
        sheetCount={state.sheets.length}
        loading={loadingFile}
        onPick={loadFile}
        onClear={() => setState(createInitialState())}
      />

      {state.filePath && (
        <>
          <SheetSelector
            sheets={state.sheets}
            gastosSheet={state.gastosSheet}
            ventasSheet={state.ventasSheet}
            columnMap={state.columnMap}
            onChange={(patch) => setState((prev) => ({ ...prev, ...patch, previewData: null }))}
          />

          <SectionBuilder
            sections={state.sections}
            onChange={(sections) =>
              setState((prev) => ({ ...prev, sections, previewData: null }))
            }
          />

          <ReportPreview
            previewData={state.previewData}
            sections={state.sections}
            loading={loadingPreview || state.generating}
            onRefresh={refreshPreview}
            onGenerate={handleGenerate}
          />
        </>
      )}
    </div>
  );
}
