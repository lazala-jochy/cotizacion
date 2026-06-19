/** Datos de ejemplo para vista previa del diseñador de plantillas. */
export function samplePreviewQuote() {
  return {
    numero: 'COT-2026-0001',
    fecha: new Date().toISOString().slice(0, 10),
    validez_dias: 30,
    client_nombre: 'Cliente de ejemplo',
    client_rnc: '000000000',
    client_direccion: 'Santo Domingo',
    client_telefono: '809-000-0000',
    client_email: 'cliente@ejemplo.com',
    subtotal: 10000,
    itbis: 1800,
    total: 11800,
    notas: 'Vista previa del diseñador.',
    ejecutivo: 'Ejecutivo demo',
    forma_pago: 'Transferencia',
    estado: 'creada',
    items: [
      {
        descripcion: 'Servicio profesional',
        cantidad: 1,
        precio_unitario: 10000,
        total: 10000,
      },
    ],
  };
}

export function samplePreviewEmisor() {
  return {
    nombre: 'Mi Empresa SRL',
    rnc: '000000000',
    direccion: 'Santo Domingo, RD',
    telefono: '809-000-0000',
    email: 'empresa@ejemplo.com',
    logo: null,
    firma: null,
    sello: null,
    mensaje_pdf: 'Gracias por confiar en nuestro equipo.',
  };
}
