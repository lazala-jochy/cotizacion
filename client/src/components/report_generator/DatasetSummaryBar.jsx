import { IconSheet } from './icons';

export default function DatasetSummaryBar({ schema, fileName }) {
  if (!schema) return null;

  const dims = schema.dimensions || {};

  const stats = [
    { label: 'Filas', value: schema.recordCount?.toLocaleString('es-DO') },
    { label: 'Hojas', value: schema.sheets?.length || 0 },
    dims.product?.values?.length
      ? { label: 'Productos', value: dims.product.values.length }
      : null,
    dims.entity?.values?.length ? { label: 'Proveedores', value: dims.entity.values.length } : null,
    dims.category?.values?.length
      ? { label: 'Categorías', value: dims.category.values.length }
      : null,
  ].filter(Boolean);

  return (
    <div className="report-studio-summary">
      <div className="report-studio-summary-file">
        <span className="report-studio-summary-icon">
          <IconSheet />
        </span>
        <div>
          <strong>{fileName || schema.fileName}</strong>
          <span className="muted">Datos listos para filtrar</span>
        </div>
      </div>
      <div className="report-studio-summary-stats">
        {stats.map((s) => (
          <div key={s.label} className="report-studio-stat">
            <span className="report-studio-stat-value">{s.value}</span>
            <span className="report-studio-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
