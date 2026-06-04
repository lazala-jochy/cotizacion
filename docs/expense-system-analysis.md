# Análisis: Gestión de gastos en sistemas empresariales

Documento de referencia previo a la implementación del módulo de gastos en Cotizaciones App. Basado en patrones de **QuickBooks**, **Odoo**, **Zoho Books**, **Xero**, **FreshBooks**, **Wave**, **SAP Business One** y **Oracle NetSuite**.

## Referencias consultadas

| Sistema | Enfoque principal | Fuente |
|---------|-------------------|--------|
| QuickBooks | Proyectos (Jobs), cost codes, gastos por trabajo | [Job costing QBO](https://www.accountingdepartment.com/blog/job-costing-in-quickbooks-online-for-small-businesses) |
| Odoo | Contabilidad analítica, centros de costo por proyecto/departamento | [Odoo Analytic Accounting](https://www.odoo.com/documentation) |
| Xero | Projects + Tracking Categories, P&L por unidad | [Xero Projects](https://www.xero.com/us/accounting-software/track-projects/job-costing/) |
| FreshBooks | Gastos por proyecto, COGS vs operativos, rentabilidad | [FreshBooks vs Xero](https://fitsmallbusiness.com/freshbooks-vs-xero/) |
| Zoho Books | Categorías, asignación a clientes y proyectos | Documentación Zoho Books |
| SAP B1 | Centros de costo, imputación a documentos | SAP Business One Help |

## Tipos de gastos en ERP reales

| Tipo | Ejemplos | Clasificación típica |
|------|----------|----------------------|
| Operativos | Combustible, transporte, viáticos | Costo del trabajo / proyecto |
| Administrativos | Alquiler, internet, nómina admin | Gasto operativo (OPEX) |
| Ventas | Publicidad, comisiones, marketing | Gasto comercial |
| Costo de ventas (COGS) | Materiales directos, compras para entrega | Costo de producto |
| Financieros | Intereses, comisiones bancarias | Fuera de utilidad operativa |
| Impuestos (no ITBIS facturado) | ISR, patentes | Según plan contable |

En sistemas como **FreshBooks** y **Xero**, los gastos ligados a un **proyecto/cotización** alimentan el **job costing**: ingresos del documento menos costos directos (producto + gastos asociados) = utilidad del trabajo.

## Campos obligatorios (mejores prácticas)

| Campo | Obligatorio | Motivo |
|-------|-------------|--------|
| Fecha | Sí | Período fiscal y reportes |
| Monto > 0 | Sí | Integridad financiera |
| Categoría | Sí | Agrupación y P&L |
| Descripción | Sí | Auditoría y búsqueda |
| Método de pago | Recomendado | Conciliación |
| Referencia / comprobante | Opcional | Trazabilidad |
| Adjunto (recibo/factura) | Opcional | Evidencia fiscal |
| Vínculo (cotización/factura/cliente/proyecto) | Opcional | Rentabilidad por trabajo |

## Impacto en rentabilidad

**Fórmula estándar (job costing):**

```
Utilidad bruta = Ingresos (subtotal − descuento) − Costo de productos
Utilidad neta del trabajo = Utilidad bruta − Gastos asociados al trabajo
Margen % = (Utilidad neta / Ingresos) × 100
```

**Ejemplo (caso de uso del proyecto):**

- Venta: RD$500,000 (subtotal)
- Costo productos (10 laptops): RD$400,000
- Gastos: transporte RD$10,000 + instalación RD$15,000 + viáticos RD$5,000 = RD$30,000
- Utilidad neta = 500,000 − 400,000 − 30,000 = **RD$70,000**
- Margen = 70,000 / 500,000 = **14%**

## Impacto por módulo

| Módulo | Comportamiento |
|--------|----------------|
| **Cotizaciones** | Gastos asociados + costo unitario en ítems → panel de rentabilidad antes de facturar |
| **Facturas** | Gastos heredados o nuevos → utilidad real post-venta |
| **Reportes** | Totales por categoría, período, cliente, proyecto |
| **Estado de resultados** | Ingresos (facturas) − COGS (costo ítems) − Gastos (período) = utilidad operativa |
| **Dashboard** | Gastos del mes/año, top categorías, ingresos vs gastos |

## Cálculo de utilidad neta (empresa)

A nivel empresa (estado de resultados simplificado):

```
Ingresos = Σ totales de facturas emitidas (excl. anuladas) en el período
Costos   = Σ (costo_unitario × cantidad) en ítems de esas facturas
Gastos   = Σ gastos registrados en el período
Utilidad operativa = Ingresos − Costos − Gastos
```

## Decisiones de diseño en esta app

1. **`user_id`** como ámbito de empresa (no hay multi-empresa).
2. **Categorías** por usuario, con semillas estándar (Transporte, Nómina, etc.).
3. **Proyectos** opcionales para agrupar gastos y cotizaciones.
4. **`costo_unitario`** en ítems de cotización/factura para COGS.
5. **Adjuntos** en base64 (mismo patrón que logo de empresa).
6. **Exportación** CSV (compatible Excel) y PDF HTML; sin dependencias nuevas.

## Guía rápida de uso

### Registrar un gasto

1. Menú **Compras → Gastos** → **+ Nuevo gasto**.
2. Complete fecha, categoría, descripción y monto.
3. Opcional: adjunte recibo (PDF/JPG/PNG) y referencia de pago.

### Vincular a una cotización

1. Abra la cotización → sección **Gastos asociados** → **+ Agregar gasto**.
2. El gasto queda ligado al `quote_id` y aparece en **Rentabilidad de la cotización**.

### Costo de productos

En **Nueva/Editar cotización**, columna **Costo unit.** por ítem. Con precio de venta y gastos asociados, el panel muestra utilidad bruta, neta y margen %.

### Estado de resultados

**Compras → Estado de resultados** → rango de fechas → **Generar**.

### Exportar

**Compras → Reporte de gastos** → filtros → **Exportar CSV** (abre en Excel) o **Exportar HTML/PDF** (imprimir desde el navegador).

### Fórmulas implementadas

```
Ingreso (base) = subtotal − descuento
Costo productos = Σ (costo_unitario × cantidad)
Utilidad bruta = Ingreso − Costo productos
Utilidad neta = Utilidad bruta − Gastos asociados
Margen % = (Utilidad neta / Ingreso) × 100
```
