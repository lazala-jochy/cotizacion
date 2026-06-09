# Report Builder — Arquitectura dinámica

Módulo **desacoplado** (`report_builder`). No modifica cotizaciones, facturas, compras ni otros flujos.

## Principio central

**Cero listas fijas.** Todos los proveedores, productos, categorías y valores de filtro se extraen del archivo cargado.

## Servicios

| Servicio | Archivo | Responsabilidad |
|----------|---------|-----------------|
| ExcelAnalyzer | `ExcelAnalyzer.js` | Hojas, columnas, tipos, semántica |
| DatasetBuilder | `DatasetBuilder.js` | Valores únicos, relaciones, schema enriquecido |
| QueryEngine | `QueryEngine.js` | Filtros, agrupaciones, métricas |
| NaturalLanguageInterpreter | `NaturalLanguageInterpreter.js` | NL → consulta (usa `uniqueValues`) |
| ChartEngine | `ChartEngine.js` | Spec de gráficos + SVG para PDF |
| PdfExporter | `PdfExporter.js` | PDF (puppeteer) o HTML fallback |
| ReportBuilder | `ReportBuilder.js` | Orquestador |

## Flujo

```
Excel/CSV → ExcelAnalyzer → DatasetBuilder
  → schema (columnas + uniqueValues + relationships)
  → datasetStore (memoria, TTL 1h)

Consulta visual o NL → QueryEngine → ChartEngine → vista previa

Export → SpreadsheetExporter (csv/xlsx) | PdfExporter (pdf)
```

## Schema enriquecido

```json
{
  "columns": [...],
  "uniqueValues": { "proveedor": ["...", "..."] },
  "filterableColumns": [{ "key", "label", "options": [...] }],
  "groupableColumns": [{ "key", "supportsMonthYear": true }],
  "relationships": [{ "columns": ["proveedor", "producto"], "topPairs": [...] }]
}
```

## Lenguaje natural

Patrones genéricos (sin entidades hardcodeadas):

- "cada proveedor" → agrupa por columna entity
- "producto más vendido" → ranking por columna sale
- "compré de {valor}" → filtra si `{valor}` existe en `uniqueValues`
- "margen" / "compras y ventas" → métricas purchase + sale

Extensible a LLM reemplazando `interpretNaturalLanguage()`.

## Integración (solo cableado)

- `server/index.js` → `/api/report-builder`
- `server/licensing/modules.js` + `client/src/licensing/modules.js`
- `client/src/App.jsx` → `/report-builder`
- `client/src/api.js` → `api.report_builder.*`

## Tests

`tests/report_builder.test.cjs`
