import { useState } from 'react';
import { api } from '../../api';
import FileUploadZone from '../../components/report_generator/FileUploadZone';
import ReportStepper from '../../components/report_generator/ReportStepper';
import DatasetSummaryBar from '../../components/report_generator/DatasetSummaryBar';
import ReportGeneratorForm from '../../components/report_generator/ReportGeneratorForm';
import ReportResults from '../../components/report_generator/ReportResults';

const EMPTY_SELECTIONS = {
  products: [],
  providers: [],
  categories: [],
  dateFrom: '',
  dateTo: '',
};

function getActiveStep(schema, report) {
  if (report) return 4;
  if (schema) return 2;
  return 1;
}

export default function ReportBuilderPage() {
  const [fileName, setFileName] = useState('');
  const [datasetId, setDatasetId] = useState(null);
  const [schema, setSchema] = useState(null);
  const [selections, setSelections] = useState(EMPTY_SELECTIONS);
  const [reportType, setReportType] = useState('purchases');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingRun, setLoadingRun] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleFile = async (file) => {
    setError('');
    setReport(null);
    setSelections(EMPTY_SELECTIONS);
    setLoadingAnalyze(true);
    setFileName(file.name);

    try {
      const reader = new FileReader();
      const contentBase64 = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const result = String(reader.result || '');
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });

      const data = await api.report_builder.analyze({ fileName: file.name, contentBase64 });
      setDatasetId(data.datasetId);
      setSchema(data.schema);
    } catch (err) {
      setError(err.message);
      setSchema(null);
      setDatasetId(null);
    } finally {
      setLoadingAnalyze(false);
    }
  };

  const handleGenerate = async () => {
    if (!datasetId) return;
    setError('');
    setLoadingRun(true);
    try {
      const data = await api.report_builder.run({ datasetId, reportType, selections });
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRun(false);
    }
  };

  const handleExport = async (format) => {
    if (!datasetId || !report) return;
    setExporting(true);
    try {
      const payload = {
        datasetId,
        format,
        rows: report.result?.rows || [],
        summary: report.result?.summary || {},
        title: `Reporte - ${report.meta?.reportLabel || 'Reporte'}`,
        filters: report.result?.appliedFilters || [],
        chartSpec: report.result?.chartSpec,
      };

      const result = await api.report_builder.exportBlob(payload);
      if (result?.html) {
        window.open(URL.createObjectURL(new Blob([result.html], { type: 'text/html' })), '_blank');
        return;
      }

      const ext = format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xlsx' : 'csv';
      const url = URL.createObjectURL(result);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const activeStep = getActiveStep(schema, report);

  return (
    <div className="page report-studio-page">
      <header className="report-studio-hero">
        <div>
          <p className="report-studio-hero-eyebrow">Report Builder</p>
          <h1>Generador de reportes</h1>
          <p>Usted decide qué productos, proveedores y métricas analizar.</p>
        </div>
      </header>

      <ReportStepper activeStep={activeStep} />

      <FileUploadZone
        onFile={handleFile}
        loading={loadingAnalyze}
        fileName={fileName}
        schema={schema}
      />

      {error && <div className="alert alert-error report-studio-alert">{error}</div>}

      {schema && <DatasetSummaryBar schema={schema} fileName={fileName} />}

      {schema ? (
        <ReportGeneratorForm
          schema={schema}
          selections={selections}
          onSelectionsChange={setSelections}
          reportType={reportType}
          onReportTypeChange={setReportType}
          onGenerate={handleGenerate}
          loading={loadingRun}
        />
      ) : (
        !loadingAnalyze && (
          <section className="report-studio-hint-panel">
            <p>
              <strong>Paso 1:</strong> arrastre su Excel o haga clic para cargarlo. Los filtros se
              generan automáticamente desde los datos del archivo.
            </p>
          </section>
        )
      )}

      {schema && (
        <ReportResults
          report={report}
          schema={schema}
          onExport={handleExport}
          exporting={exporting}
        />
      )}
    </div>
  );
}
