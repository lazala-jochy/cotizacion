# Formatos fiscales DGII (606, 607, 608)

Este módulo genera archivos de texto para cargar en la **Oficina Virtual (OFV)** de la Dirección General de Impuestos Internos (DGII) de República Dominicana.

> **Importante:** La DGII publica instructivos y plantillas que pueden actualizarse. Antes de enviar un archivo a producción, valídelo con el **pre-validador** y la plantilla vigente en [dgii.gov.do](https://www.dgii.gov.do).

## Referencias oficiales

| Documento | Descripción | Enlace |
|-----------|-------------|--------|
| Norma General 07-2018 | Formatos de envío de datos (606, 607, 608, etc.) | [PDF Norma 07-2018](https://www.dgii.gov.do/legislacion/normasGenerales/Documents/Norma%2007-2018.pdf) |
| Norma General 05-2019 | Modificaciones a formatos de envío | [PDF Norma 05-2019](https://www.dgii.gov.do/legislacion/normasGenerales/Documents/Norma%2005-2019.pdf) |
| Instructivo Formato 607 | Ventas de bienes y servicios | [dgii.gov.do — Formato 607](https://www.dgii.gov.do/cicloContribuyente/obligacionesTributarias/remisionInformacion/Paginas/formato607.aspx) |
| Instructivo Formato 608 | Comprobantes fiscales anulados | [dgii.gov.do — Formato 608](https://www.dgii.gov.do/cicloContribuyente/obligacionesTributarias/remisionInformacion/Paginas/formato608.aspx) |
| Instructivo Formato 606 | Compras de bienes y servicios | [dgii.gov.do — Formato 606](https://www.dgii.gov.do/cicloContribuyente/obligacionesTributarias/remisionInformacion/Paginas/formato606.aspx) |
| e-CF / facturación electrónica | Comprobantes electrónicos | [dgii.gov.do — e-CF](https://www.dgii.gov.do/facturacion) |

## Formato 607 — Ventas

**Qué reporta:** Ventas de bienes y servicios del período (mes calendario `AAAAMM`).

**Fuente en la app:** Facturas emitidas (`invoices`) con `fecha_emision` en el período y `estado != 'anulada'`.

**Campos principales (detalle):**

- RNC/Cédula del comprador y tipo de identificación
- NCF del comprobante
- Fecha del comprobante
- Monto facturado (gravado), ITBIS facturado, retenciones
- Tipo de ingreso

**Flujo en la app:**

1. Menú **DGII → Formato 607**
2. Seleccionar año y mes → **Vista previa**
3. Corregir errores (RNC del cliente, NCF, etc.)
4. **Exportar TXT** → se guarda en historial y en disco local

## Formato 608 — Comprobantes anulados

**Qué reporta:** NCF anulados en el período con **motivo de anulación** (códigos 01–10).

**Fuente en la app:** Facturas con `estado = 'anulada'` y tabla `cancelled_invoices`.

**Motivos de anulación (catálogo DGII):**

| Código | Descripción |
|--------|-------------|
| 01 | Deterioro de factura preimpresa |
| 02 | Errores de impresión (factura preimpresa) |
| 03 | Impresión defectuosa |
| 04 | Corrección de la información |
| 05 | Cambio de productos |
| 06 | Devolución de productos |
| 07 | Omisión de productos |
| 08 | Errores en secuencia de NCF |
| 09 | Por cese de operaciones |
| 10 | Pérdida o hurto de talonarios |

Al **anular una factura** en la app se solicita el código DGII; se sincroniza automáticamente a `cancelled_invoices`.

## Formato 606 — Compras

**Qué reporta:** Compras de bienes y servicios con NCF de proveedores.

**Fuente en la app:** Registros manuales en `dgii_purchases` (proveedores opcionales en `dgii_suppliers`).

**Campos principales:**

- RNC/Cédula proveedor, tipo identificación
- NCF, fechas comprobante y pago
- Monto facturado, ITBIS, retenciones ISR/ITBIS
- Tipo de bien o servicio comprado

## Estructura TXT

Los archivos generados usan **campos separados por pipe (`|`)** y codificación UTF-8, alineados a los instructivos post–Norma 07-2018. La DGII puede exigir longitudes fijas o separadores exactos según la versión del pre-validador; **siempre ejecute el pre-validador oficial** antes del envío.

Ruta local de exportación:

`~/.cotizaciones-app/dgii-exports/{userId}/`

## Validaciones implementadas

- Período fiscal `AAAAMM`
- RNC (9 u 11 dígitos, dígito verificador)
- Cédula (11 dígitos)
- NCF / e-CF (serie + secuencia)
- Motivo de anulación 01–10
- Montos no negativos
- Límites de registros (607: 65 000; 608: 4 999)
- RNC del emisor configurado en **Empresa**

## Historial

Tabla `dgii_reports`: tipo (606/607/608), período, ruta del archivo, cantidad de registros, fecha de generación. Descarga desde **DGII → Historial**.

## Campos faltantes / limitaciones

| Área | Estado | Nota |
|------|--------|------|
| Retenciones en ventas (607) | Parcial | Se exportan en 0; ampliar si registra retenciones |
| Monto exento / gravado desglosado | Parcial | Se usa subtotal − descuento como monto facturado |
| e-CF campos extendidos | Parcial | Validación NCF básica; campos XML e-CF no incluidos |
| Compras (606) | Manual | No hay módulo de cuentas por pagar integrado |
| Tipo de pago DGII codificado | Parcial | Se envía texto de `forma_pago` si existe |

## Pruebas

```bash
npm test
```

Incluye `tests/dgii-validators.test.cjs` y `tests/dgii-generators.test.cjs`.
