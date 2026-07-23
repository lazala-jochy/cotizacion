/**
 * Prueba de extracción OCR con datos reales de la factura
 */

const { extractRNC, extractNCF, extractAmounts, extractDate, extractSupplierName } = require('./server/ocr/invoiceOcrExtractor');

// Simulación de texto OCR extraído de una factura similar
const sampleText = `
REPÚBLICA DOMINICANA
DIRECCIÓN GENERAL DE IMPUESTOS INTERNOS

FACTURA
VÁLIDA PARA CRÉDITO FISCAL

FORMULARIO
606

NCF:
B010000123

RNC EMISOR:
402-34567-8

FECHA DE EMISIÓN:
24/05/2024 10:30 AM

DATOS DEL EMISOR

Nombre / Razón Social:
José Antonio Rosario

Nombre Comercial:
Lazada Dev

RNC:
402-34567-8

Dirección:
C/ Principal #123, Los Riles
Santiago, República Dominicana

Teléfono:
(809) 555-1234

DATOS DEL RECEPTOR

Nombre / Razón Social:
Omega Solutions, SRL

RNC / Cédula:
131-56789-2

Dirección:
Av. 27 de Febrero #500, Ens. Piantini
Santo Domingo, República Dominicana

Teléfono:
(809) 555-5678

CÓDIGO DESCRIPCIÓN CANT. UNIDAD PRECIO UNITARIO (RD$) MONTO (RD$)
SRV-001 Desarrollo de API REST con Node.js y TypeScript 1 UD 75,000.00 75,000.00
SRV-002 Integración y despliegue en Google Cloud Run 1 UD 25,000.00 25,000.00
SRV-003 Soporte y mantenimiento (mensual) 1 UD 10,000.00 10,000.00

VALOR EN LETRAS:
Ciento veintitrés mil ochocientos pesos dominicanos con 00/100

CONDICIONES DE PAGO:
Contado

OBSERVACIONES:
Servicio de desarrollo de software según acuerdo.

SUBTOTAL RD$ 110,000.00
ITBIS (18%) RD$ 19,800.00
TOTAL A PAGAR RD$ 129,800.00

Esta factura ha sido firmada digitalmente
conforme a la Norma General 06-2023
de la Dirección General de Impuestos Internos.

José Antonio Rosario
Emisor Autorizado
`;

console.log('========== PRUEBA DE EXTRACCIÓN OCR ==========\n');

// Test 1: RNC
console.log('1️⃣ Extrayendo RNC...');
const rnc = extractRNC(sampleText);
console.log(`   Resultado: "${rnc}"`);
console.log(`   Esperado: "4023456788" o similar`);
console.log(`   ${rnc ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 2: NCF
console.log('2️⃣ Extrayendo NCF...');
const ncf = extractNCF(sampleText);
console.log(`   Resultado: "${ncf}"`);
console.log(`   Esperado: "B010000123"`);
console.log(`   ${ncf === 'B010000123' ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 3: Montos
console.log('3️⃣ Extrayendo montos...');
const amounts = extractAmounts(sampleText);
console.log(`   Subtotal: RD$ ${amounts.base}`);
console.log(`   ITBIS: RD$ ${amounts.itbis}`);
console.log(`   Esperado: base=110000.00, itbis=19800.00`);
console.log(`   ${amounts.base === 110000 && amounts.itbis === 19800 ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 4: Fecha
console.log('4️⃣ Extrayendo fecha...');
const date = extractDate(sampleText);
console.log(`   Resultado: "${date}"`);
console.log(`   Esperado: "2024-05-24" o similar`);
console.log(`   ${date === '2024-05-24' ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 5: Nombre del proveedor
console.log('5️⃣ Extrayendo nombre del proveedor...');
const supplier = extractSupplierName(sampleText);
console.log(`   Resultado: "${supplier}"`);
console.log(`   ✓ Encontrado\n`);

console.log('========== RESUMEN ==========');
console.log(`RNC: ${rnc ? '✓' : '✗'}`);
console.log(`NCF: ${ncf ? '✓' : '✗'}`);
console.log(`MONTOS: ${amounts.base && amounts.itbis ? '✓' : '✗'}`);
console.log(`FECHA: ${date ? '✓' : '✗'}`);
console.log(`PROVEEDOR: ${supplier ? '✓' : '✗'}`);
