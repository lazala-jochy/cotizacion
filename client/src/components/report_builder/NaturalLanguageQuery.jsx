function buildDynamicExamples(schema) {
  if (!schema?.columns?.length) {
    return [
      'Muéstrame cuánto gasté en cada proveedor.',
      '¿Cuál fue mi producto más vendido?',
      'Compara compras y ventas.',
    ];
  }

  const entityCol = schema.columns.find((c) => ['entity', 'branch'].includes(c.semantic));
  const productCol = schema.columns.find((c) => c.semantic === 'product');
  const entitySample = entityCol ? schema.uniqueValues?.[entityCol.key]?.[0] : null;
  const productSample = productCol ? schema.uniqueValues?.[productCol.key]?.[0] : null;

  const examples = [
    entityCol ? `Muéstrame cuánto gasté en cada ${entityCol.label.toLowerCase()}.` : null,
    productCol ? '¿Cuál fue mi producto más vendido?' : null,
    productSample ? `¿Cuánto compré de ${productSample.toLowerCase()}?` : null,
    entityCol ? `¿Qué ${entityCol.label.toLowerCase()} representa el mayor gasto?` : null,
    'Genera un ranking de productos por ventas.',
    productSample && entitySample
      ? `Compara compras y ventas de ${productSample.toLowerCase()}.`
      : 'Compara compras y ventas.',
  ].filter(Boolean);

  return [...new Set(examples)].slice(0, 5);
}

export default function NaturalLanguageQuery({ schema, value, onChange, onRun, loading, lastExplanation }) {
  const examples = buildDynamicExamples(schema);

  return (
    <section className="panel">
      <h2 className="panel-title">Consulta en lenguaje natural</h2>
      <p className="muted">
        El motor interpreta la consulta usando columnas y valores únicos detectados en tu archivo.
      </p>
      <textarea
        className="report-builder-nl-input"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ej: Muéstrame cuánto gasté en cada proveedor."
      />
      <div className="report-builder-examples">
        {examples.map((ex) => (
          <button key={ex} type="button" className="btn-ghost btn-sm" onClick={() => onChange(ex)}>
            {ex}
          </button>
        ))}
      </div>
      <button type="button" className="btn-primary" onClick={onRun} disabled={loading || !value.trim()}>
        {loading ? 'Generando…' : 'Generar reporte'}
      </button>
      {lastExplanation && <p className="muted report-builder-explanation">{lastExplanation}</p>}
    </section>
  );
}
