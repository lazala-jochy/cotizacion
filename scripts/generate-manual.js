const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '..', 'manual', 'Manual_de_Usuario_Cotizaciones.pdf');
const IMAGES_DIR = path.join(__dirname, '..', 'manual');
const LOGO = path.join(__dirname, '..', 'asset', 'icon.png');

const BLUE = '#4f6ef7';
const DARK = '#0f2744';
const GRAY = '#475569';
const LIGHT_BG = '#f1f5f9';

function addCover(doc) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(DARK);

  if (fs.existsSync(LOGO)) {
    doc.image(LOGO, (doc.page.width - 100) / 2, 150, { width: 100 });
  }

  doc
    .fill('#ffffff')
    .fontSize(36)
    .font('Helvetica-Bold')
    .text('Manual de Usuario', 0, 290, { align: 'center' });

  doc
    .fontSize(20)
    .font('Helvetica')
    .fillColor(BLUE)
    .text('Sistema de Cotizaciones', 0, 340, { align: 'center' });

  doc
    .fontSize(13)
    .fillColor('#94a3b8')
    .text('Versión 1.13.0', 0, 380, { align: 'center' });

  doc
    .fontSize(12)
    .fillColor('#cbd5e1')
    .text('Genera y administra cotizaciones para tu negocio', 0, 420, { align: 'center' });

  doc
    .fontSize(11)
    .fillColor('#64748b')
    .text(`Fecha: ${new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}`, 0, 700, { align: 'center' });
}

function addTableOfContents(doc) {
  doc.addPage();
  doc.fillColor(DARK).fontSize(24).font('Helvetica-Bold').text('Índice', 60, 60);

  doc.moveTo(60, 95).lineTo(540, 95).strokeColor(BLUE).lineWidth(2).stroke();

  const items = [
    ['1.', 'Introducción', 3],
    ['2.', 'Registro y Creación de Cuenta', 4],
    ['3.', 'Inicio de Sesión', 5],
    ['4.', 'Pantalla de Inicio (Dashboard)', 6],
    ['5.', 'Crear Nueva Cotización', 7],
    ['6.', 'Listado de Cotizaciones', 8],
    ['7.', 'Reportes y Estadísticas', 9],
    ['8.', 'Gestión de Clientes', 10],
    ['9.', 'Configuración de Empresa', 11],
    ['10.', 'Envío de Cotizaciones por Correo', 12],
  ];

  let y = 120;
  for (const [num, title, page] of items) {
    doc.fillColor(BLUE).fontSize(12).font('Helvetica-Bold').text(num, 60, y, { continued: true });
    doc.fillColor(DARK).font('Helvetica').text(`  ${title}`, { continued: true });
    doc.fillColor(GRAY).text(`  ${'·'.repeat(40)}  ${page}`, { align: 'right' });
    y += 28;
  }
}

function sectionHeader(doc, title, subtitle) {
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 100).fill(DARK);
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(title, 60, 35);
  if (subtitle) {
    doc.fontSize(12).fillColor('#93c5fd').font('Helvetica').text(subtitle, 60, 65);
  }
  return 130;
}

function paragraph(doc, text, y, opts = {}) {
  const x = opts.x || 60;
  const width = opts.width || 480;
  doc.fillColor(opts.color || GRAY).fontSize(opts.size || 11).font(opts.font || 'Helvetica');
  doc.text(text, x, y, { width, lineGap: 4 });
  return doc.y + 12;
}

function bulletList(doc, items, y) {
  for (const item of items) {
    doc.fillColor(BLUE).fontSize(11).font('Helvetica-Bold').text('•', 70, y);
    doc.fillColor(GRAY).font('Helvetica').text(item, 85, y, { width: 450, lineGap: 3 });
    y = doc.y + 8;
  }
  return y;
}

function addImage(doc, filename, y, opts = {}) {
  const imgPath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(imgPath)) return y;
  const width = opts.width || 420;
  const x = opts.x || (doc.page.width - width) / 2;

  if (y + 250 > doc.page.height - 60) {
    doc.addPage();
    y = 60;
  }

  doc.roundedRect(x - 4, y - 4, width + 8, opts.height ? opts.height + 8 : 260, 6)
    .fillAndStroke(LIGHT_BG, '#e2e8f0');

  doc.image(imgPath, x, y, { width, ...(opts.height ? { height: opts.height } : { fit: [width, 240] }) });
  return (opts.height ? y + opts.height : y + 250) + 20;
}

function generate() {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
  const stream = fs.createWriteStream(OUTPUT);
  doc.pipe(stream);

  // --- Portada ---
  addCover(doc);

  // --- Índice ---
  addTableOfContents(doc);

  // --- 1. Introducción ---
  let y = sectionHeader(doc, '1. Introducción', 'Descripción general del sistema');
  y = paragraph(doc, 'El Sistema de Cotizaciones es una aplicación de escritorio diseñada para facilitar la creación, gestión y seguimiento de cotizaciones comerciales (pre-facturas). Permite a empresas y profesionales independientes generar documentos profesionales, administrar clientes y controlar el estado de sus propuestas comerciales.', y);
  y += 10;
  y = paragraph(doc, 'Características principales:', y, { font: 'Helvetica-Bold', color: DARK });
  y = bulletList(doc, [
    'Creación rápida de cotizaciones con numeración automática',
    'Gestión completa de clientes (nombre, RNC, dirección, teléfono, email)',
    'Generación automática de PDF (pre-factura) con formato profesional',
    'Envío de cotizaciones por correo electrónico con PDF adjunto',
    'Control de estados: Creada, Enviada, Pago parcial, Pagada, Cancelada',
    'Registro de pagos y seguimiento de balance pendiente',
    'Reportes y gráficos de ventas, cobros y evolución de montos',
    'Configuración de datos de empresa (logo, RNC, dirección, SMTP)',
    'Actualizaciones automáticas de la aplicación',
  ], y);

  // --- 2. Registro ---
  y = sectionHeader(doc, '2. Registro y Creación de Cuenta', 'Primeros pasos para usar el sistema');
  y = paragraph(doc, 'Al abrir la aplicación por primera vez, puede crear una cuenta nueva siguiendo estos pasos:', y);
  y += 5;
  y = bulletList(doc, [
    'Haga clic en "Crear cuenta" en la pantalla de inicio de sesión.',
    'Paso 1 - Empresa: Complete la razón social, RNC y opcionalmente suba el logo de su empresa (PNG o JPG, máx. 2 MB).',
    'Paso 2 - Cuenta: Ingrese su nombre, correo electrónico y una contraseña segura.',
    'Presione "Crear cuenta" para finalizar el registro.',
  ], y);
  y += 10;
  y = addImage(doc, '9.png', y);
  y = paragraph(doc, 'Figura 2.1 — Formulario de creación de cuenta (Paso 1: Datos de empresa)', y - 10, { size: 9, color: '#94a3b8' });

  // --- 3. Inicio de sesión ---
  y = sectionHeader(doc, '3. Inicio de Sesión', 'Acceder al sistema');
  y = paragraph(doc, 'Para acceder al sistema, ingrese su correo electrónico y contraseña en la pantalla de inicio de sesión, luego presione el botón "Entrar".', y);
  y += 5;
  y = paragraph(doc, 'Si olvidó su contraseña, contacte al administrador del sistema. El botón "Ver" permite visualizar la contraseña mientras la escribe.', y);
  y += 10;
  y = addImage(doc, '1.png', y);
  y = paragraph(doc, 'Figura 3.1 — Pantalla de inicio de sesión', y - 10, { size: 9, color: '#94a3b8' });

  // --- 4. Dashboard ---
  y = sectionHeader(doc, '4. Pantalla de Inicio (Dashboard)', 'Vista general del sistema');
  y = paragraph(doc, 'Al iniciar sesión, verá la pantalla principal con:', y);
  y = bulletList(doc, [
    'Contadores: Número total de cotizaciones y clientes registrados.',
    'Accesos rápidos: Botones para crear nueva cotización, ver clientes o acceder a reportes.',
    'Tarjeta "Mi empresa": Resumen de los datos de su empresa (nombre, RNC, dirección, teléfono, email) con opción de editar.',
    'Menú lateral: Navegación a todas las secciones del sistema.',
    'Información de versión: Versión instalada y botón para buscar actualizaciones.',
  ], y);
  y += 10;
  y = addImage(doc, '3.png', y);
  y = paragraph(doc, 'Figura 4.1 — Pantalla de inicio con resumen y accesos rápidos', y - 10, { size: 9, color: '#94a3b8' });

  // --- 5. Nueva cotización ---
  y = sectionHeader(doc, '5. Crear Nueva Cotización', 'Generar una propuesta comercial');
  y = paragraph(doc, 'Para crear una nueva cotización:', y);
  y = bulletList(doc, [
    'Haga clic en "+ Nueva cotización" desde el dashboard o el menú lateral.',
    'El sistema asigna automáticamente un número (ej: COT-2026-0007) y la fecha actual.',
    'Configure la validez en días (por defecto 30 días).',
    'En la sección "Cliente", busque un cliente existente o complete los datos manualmente (nombre, RNC, dirección, teléfono, email).',
    'Marque "Guardar en mi lista de clientes" si desea reutilizar los datos en futuras cotizaciones.',
    'Agregue los ítems/conceptos con descripción, cantidad y precio unitario.',
    'Configure el ITBIS si aplica (18% por defecto).',
    'Presione "Guardar" para crear la cotización en estado "Creada".',
  ], y);
  y += 10;
  y = addImage(doc, '4.png', y);
  y = paragraph(doc, 'Figura 5.1 — Formulario de nueva cotización', y - 10, { size: 9, color: '#94a3b8' });

  // --- 6. Listado de cotizaciones ---
  y = sectionHeader(doc, '6. Listado de Cotizaciones', 'Consultar y administrar cotizaciones');
  y = paragraph(doc, 'La sección "Cotizaciones" muestra todas las cotizaciones generadas en una tabla con las siguientes columnas:', y);
  y = bulletList(doc, [
    'Número: Identificador único de la cotización (ej: COT-2026-0001).',
    'Cliente: Nombre del cliente asociado.',
    'Fecha: Fecha de creación de la cotización.',
    'Total: Monto total incluyendo ITBIS.',
    'Pendiente: Balance pendiente de pago (en rojo si hay balance).',
    'Estado: Selector para cambiar el estado (Creada, Enviada, Pago parcial, Pagada, Cancelada).',
    'PDF: Botón para descargar la pre-factura en formato PDF.',
    'Acciones: Ver detalle, editar, eliminar o registrar pagos.',
  ], y);
  y += 5;
  y = paragraph(doc, 'Use la barra de búsqueda para filtrar por número, cliente o RNC. El filtro de estado permite ver solo cotizaciones en un estado específico.', y);
  y += 10;
  y = addImage(doc, '5.png', y);
  y = paragraph(doc, 'Figura 6.1 — Listado de cotizaciones con filtros y paginación', y - 10, { size: 9, color: '#94a3b8' });

  // --- 7. Reportes ---
  y = sectionHeader(doc, '7. Reportes y Estadísticas', 'Análisis visual de ventas');
  y = paragraph(doc, 'La sección de Reportes ofrece un resumen visual del desempeño comercial:', y);
  y = bulletList(doc, [
    'Total cotizado: Suma de todas las cotizaciones en el período seleccionado.',
    'Cotizaciones: Cantidad de cotizaciones generadas.',
    'Promedio: Monto promedio por cotización.',
    'Cobrado: Total de pagos recibidos (cotizaciones pagadas).',
    'Por cobrar: Balance pendiente total.',
    'Clientes activos: Número de clientes con cotizaciones.',
    'Gráfico "Evolución del monto": Visualización mensual del total cotizado.',
  ], y);
  y += 5;
  y = paragraph(doc, 'Puede ajustar el período usando el selector superior derecho (últimos 6 meses, último año, etc.).', y);
  y += 10;
  y = addImage(doc, '6.png', y);
  y = paragraph(doc, 'Figura 7.1 — Panel de reportes con KPIs y gráfico de evolución', y - 10, { size: 9, color: '#94a3b8' });

  // --- 8. Clientes ---
  y = sectionHeader(doc, '8. Gestión de Clientes', 'Administrar la cartera de clientes');
  y = paragraph(doc, 'La sección "Clientes" permite administrar su cartera de clientes:', y);
  y = bulletList(doc, [
    'Ver listado: Tabla con nombre, RNC, teléfono, email y acciones.',
    'Buscar: Filtre por nombre, RNC, email o teléfono.',
    'Nuevo cliente: Presione "+ Nuevo cliente" para agregar un cliente manualmente.',
    'Editar: Haga clic en el ícono de edición para modificar los datos.',
    'Eliminar: Haga clic en el ícono de papelera para eliminar (requiere confirmación).',
    'Los clientes se crean automáticamente al marcar "Guardar en mi lista" al crear una cotización.',
  ], y);
  y += 10;
  y = addImage(doc, '7.png', y);
  y = paragraph(doc, 'Figura 8.1 — Listado de clientes registrados', y - 10, { size: 9, color: '#94a3b8' });

  // --- 9. Empresa ---
  y = sectionHeader(doc, '9. Configuración de Empresa', 'Personalizar datos del emisor');
  y = paragraph(doc, 'En la sección "Empresa" puede configurar los datos que aparecen en las cotizaciones y documentos PDF:', y);
  y = bulletList(doc, [
    'Nombre / Razón social: Nombre legal de su empresa.',
    'RNC: Registro Nacional del Contribuyente.',
    'Logo: Imagen que aparece en los PDF y correos (PNG o JPG, máx. 2 MB).',
    'Dirección: Dirección física del negocio.',
    'Teléfono: Número de contacto.',
    'Email: Correo electrónico de la empresa.',
  ], y);
  y += 5;
  y = paragraph(doc, 'Configuración de envío por Gmail:', y, { font: 'Helvetica-Bold', color: DARK });
  y = bulletList(doc, [
    'Usuario (correo Gmail): Ingrese su dirección completa de Gmail.',
    'Contraseña: Use una "contraseña de aplicación" si tiene verificación en dos pasos activada (no la contraseña normal de Gmail).',
    'Esta configuración permite enviar cotizaciones por correo directamente desde la aplicación.',
  ], y);
  y += 10;
  y = addImage(doc, '8.png', y);
  y = paragraph(doc, 'Figura 9.1 — Configuración de datos de empresa y SMTP', y - 10, { size: 9, color: '#94a3b8' });

  // --- 10. Envío por correo ---
  y = sectionHeader(doc, '10. Envío de Cotizaciones por Correo', 'Enviar propuestas al cliente');
  y = paragraph(doc, 'Para enviar una cotización por correo electrónico:', y);
  y = bulletList(doc, [
    'Abra el detalle de la cotización (haga clic en el ícono de "Ver").',
    'Presione el botón "Enviar por correo".',
    'Verifique el destinatario (se prellenan con el email del cliente).',
    'Personalice el asunto y el mensaje si lo desea.',
    'Presione "Enviar" para enviar el correo con el PDF adjunto.',
  ], y);
  y += 5;
  y = paragraph(doc, 'El correo incluye:', y, { font: 'Helvetica-Bold', color: DARK });
  y = bulletList(doc, [
    'Diseño profesional con el logo y datos de su empresa.',
    'Resumen de la cotización (número, fecha, vigencia, monto total).',
    'PDF adjunto con el detalle completo (pre-factura).',
    'Botón de descarga directa del PDF para el destinatario.',
    'Firma con datos de contacto de la empresa.',
  ], y);
  y += 10;
  y = paragraph(doc, 'Requisito: Debe configurar las credenciales de Gmail en la sección "Empresa" antes de poder enviar correos. Si usa verificación en dos pasos, genere una contraseña de aplicación desde la configuración de su cuenta de Google.', y);

  // --- Pie final ---
  doc.addPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(DARK);
  doc
    .fillColor('#ffffff')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('¡Gracias por usar Cotizaciones!', 0, 300, { align: 'center' });
  doc
    .fontSize(12)
    .fillColor('#94a3b8')
    .font('Helvetica')
    .text('Para soporte técnico o sugerencias, contacte al equipo de desarrollo.', 0, 340, { align: 'center' });
  doc
    .fontSize(11)
    .fillColor('#64748b')
    .text('© 2026 Lazala Innovaciones Systems', 0, 400, { align: 'center' });

  doc.end();
  stream.on('finish', () => {
    console.log(`Manual generado: ${OUTPUT}`);
  });
}

generate();
