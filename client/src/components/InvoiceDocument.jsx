import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { invoiceEstadoLabel } from '../constants/invoiceEstados';
import HtmlPreview from './HtmlPreview';
import { SectionLoader } from './loading';
import { TEMPLATES_UPDATED_EVENT } from '../utils/templatesEvents';

function mapInvoiceForPreview(invoice) {
  return {
    numero: invoice.fiscal_number,
    fiscal_number: invoice.fiscal_number,
    tipo_comprobante: invoice.document_type_name || invoice.document_type_code,
    document_type_code: invoice.document_type_code,
    document_type_name: invoice.document_type_name,
    fecha: invoice.fecha_emision,
    fecha_vencimiento: invoice.fecha_vencimiento,
    notas: invoice.notas,
    subtotal: invoice.subtotal,
    itbis: invoice.itbis,
    descuento: invoice.descuento,
    total: invoice.total,
    ejecutivo: invoice.ejecutivo,
    forma_pago: invoice.forma_pago,
    estado: invoice.estado,
    client_nombre: invoice.client_nombre,
    client_rnc: invoice.client_rnc,
    client_direccion: invoice.client_direccion,
    client_telefono: invoice.client_telefono,
    client_email: invoice.client_email,
    items: invoice.items,
  };
}

export default function InvoiceDocument({ invoice }) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [templateRevision, setTemplateRevision] = useState(0);

  useEffect(() => {
    const onTemplatesUpdated = () => setTemplateRevision((n) => n + 1);
    window.addEventListener(TEMPLATES_UPDATED_EVENT, onTemplatesUpdated);
    return () => window.removeEventListener(TEMPLATES_UPDATED_EVENT, onTemplatesUpdated);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const template = await api.templates.getDefault();
        const { html } = await api.templates.preview(template.id, {
          quote: mapInvoiceForPreview(invoice),
          documentType: 'invoice',
          estadoLabel: invoiceEstadoLabel(invoice.estado),
        });
        if (!cancelled) setPreviewHtml(html);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invoice, templateRevision]);

  if (loading) return <SectionLoader message="Generando vista previa…" />;

  if (error) {
    return (
      <div className="alert alert-warn">
        No se pudo cargar la vista previa: {error}.{' '}
        <Link to="/plantillas">Diseñador de plantillas</Link>.
      </div>
    );
  }

  return (
    <div className="quote-document-preview-wrap">
      <HtmlPreview html={previewHtml} minHeight={640} />
    </div>
  );
}
