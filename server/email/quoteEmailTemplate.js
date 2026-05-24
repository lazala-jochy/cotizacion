const { parseLogoDataUrl } = require('./logoInline');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function formatMoney(amount) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(
    Number(amount) || 0
  );
}

function formatDate(fecha) {
  if (!fecha) return '—';
  try {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return fecha;
  }
}

const DEFAULT_INTRO =
  'Nos complace enviarle la cotización solicitada. En el documento adjunto encontrará el detalle de conceptos, precios, impuestos y condiciones comerciales aplicables.';

function buildBrandHeader(empresa, logoCid) {
  if (logoCid) {
    return `
      <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
          <td style="background:#ffffff;border-radius:8px;padding:10px 14px;">
            <img src="cid:${logoCid}" alt="${escapeHtml(empresa)}" width="140" height="56" style="display:block;max-width:140px;max-height:56px;width:auto;height:auto;border:0;object-fit:contain;" />
          </td>
        </tr>
      </table>`;
  }

  const initial = escapeHtml((empresa.charAt(0) || 'E').toUpperCase());
  return `
    <table role="presentation" cellspacing="0" cellpadding="0">
      <tr>
        <td style="width:52px;height:52px;background:#ffffff;border-radius:10px;text-align:center;vertical-align:middle;font-size:22px;font-weight:800;color:#1e3a5f;line-height:52px;">
          ${initial}
        </td>
        <td style="padding-left:16px;vertical-align:middle;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.02em;">${escapeHtml(empresa)}</p>
        </td>
      </tr>
    </table>`;
}

/**
 * Plantilla empresarial HTML + texto plano para envío de cotización.
 */
function buildQuoteEmail({ quote, emisor, customMessage, customSubject }) {
  const empresa = emisor?.nombre?.trim() || 'Nuestra empresa';
  const cliente = quote.client_nombre?.trim() || 'estimado cliente';
  const subject = customSubject?.trim() || `Cotización ${quote.numero} — ${empresa}`;
  const intro = customMessage?.trim() || DEFAULT_INTRO;

  const logoAttachment = parseLogoDataUrl(emisor?.logo);
  const logoCid = logoAttachment?.cid || null;
  const inlineAttachments = logoAttachment ? [logoAttachment] : [];

  const preheader = `Cotización ${quote.numero} · Total ${formatMoney(quote.total)} · ${empresa}`;

  const text = [
    empresa.toUpperCase(),
    emisor?.rnc ? `RNC: ${emisor.rnc}` : null,
    '─'.repeat(40),
    '',
    `Estimado/a ${cliente},`,
    '',
    intro,
    '',
    'RESUMEN DE LA COTIZACIÓN',
    `  Número:     ${quote.numero}`,
    `  Fecha:      ${formatDate(quote.fecha)}`,
    `  Válida por: ${quote.validez_dias ?? 30} días`,
    `  Total:      ${formatMoney(quote.total)}`,
    '',
    'Documento adjunto: PDF con el detalle completo de la propuesta.',
    '',
    'Quedamos a su disposición para cualquier consulta o ajuste.',
    '',
    'Atentamente,',
    empresa,
    emisor?.telefono ? `Tel.: ${emisor.telefono}` : null,
    emisor?.email ? `Correo: ${emisor.email}` : null,
    emisor?.direccion ? emisor.direccion : null,
    '',
    '—',
    'Este mensaje contiene información comercial confidencial.',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const contactBits = [
    emisor?.rnc ? `<span style="color:#64748b;">RNC</span> ${escapeHtml(emisor.rnc)}` : '',
    emisor?.telefono ? `<span style="color:#64748b;">Tel.</span> ${escapeHtml(emisor.telefono)}` : '',
    emisor?.email
      ? `<span style="color:#64748b;">Correo</span> <a href="mailto:${escapeHtml(emisor.email)}" style="color:#1e40af;text-decoration:none;">${escapeHtml(emisor.email)}</a>`
      : '',
    emisor?.direccion ? `<span style="color:#64748b;">Dirección</span> ${escapeHtml(emisor.direccion)}` : '',
  ].filter(Boolean);

  const contactHtml = contactBits.length
    ? `<p style="margin:12px 0 0;font-size:13px;color:#475569;line-height:1.8;">${contactBits.join('<br />')}</p>`
    : '';

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;background-color:#e8eef4;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#e8eef4;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#e8eef4;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="640" border="0" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;">
          <!-- Cabecera marca -->
          <tr>
            <td style="background-color:#0f2744;border-radius:12px 12px 0 0;padding:28px 36px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle" style="vertical-align:middle;">
                    ${buildBrandHeader(empresa, logoCid)}
                  </td>
                  <td valign="middle" align="right" style="vertical-align:middle;text-align:right;">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#93c5fd;">Propuesta comercial</p>
                    <p style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;line-height:1.1;">${escapeHtml(quote.numero)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Cuerpo principal -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 36px 32px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1e40af;text-transform:uppercase;letter-spacing:0.06em;">Cotización formal</p>
              <p style="margin:0 0 28px;font-size:17px;color:#0f172a;line-height:1.5;">
                Estimado/a <strong style="color:#0f172a;">${escapeHtml(cliente)}</strong>,
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#475569;line-height:1.75;">
                ${nl2br(intro)}
              </p>
              <!-- Tarjeta resumen -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:32px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="background-color:#f8fafc;padding:14px 24px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;">Resumen de la cotización</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:14px 24px;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9;">Fecha de emisión</td>
                        <td align="right" style="padding:14px 24px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${escapeHtml(formatDate(quote.fecha))}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 24px;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9;">Vigencia</td>
                        <td align="right" style="padding:14px 24px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${escapeHtml(String(quote.validez_dias ?? 30))} días</td>
                      </tr>
                      <tr>
                        <td style="padding:18px 24px;font-size:15px;color:#64748b;font-weight:600;">Monto total</td>
                        <td align="right" style="padding:18px 24px;font-size:24px;font-weight:800;color:#1e40af;letter-spacing:-0.02em;">${escapeHtml(formatMoney(quote.total))}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Adjunto -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width:44px;vertical-align:top;">
                          <div style="width:40px;height:40px;background-color:#1e40af;border-radius:8px;text-align:center;line-height:40px;font-size:11px;font-weight:800;color:#ffffff;letter-spacing:0.04em;">PDF</div>
                        </td>
                        <td style="padding-left:14px;vertical-align:top;">
                          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1e3a8a;">Documento adjunto</p>
                          <p style="margin:0;font-size:13px;color:#3b82f6;line-height:1.5;">
                            Pre-factura <strong>${escapeHtml(quote.numero)}</strong> en formato PDF
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;color:#64748b;line-height:1.7;">
                Quedamos a su entera disposición para ampliar información, aclarar dudas o ajustar la propuesta según sus requerimientos.
              </p>
            </td>
          </tr>
          <!-- Firma -->
          <tr>
            <td style="background-color:#f8fafc;padding:28px 36px;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Atentamente</p>
              <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0f2744;">${escapeHtml(empresa)}</p>
              ${contactHtml}
            </td>
          </tr>
          <!-- Pie legal -->
          <tr>
            <td style="background-color:#0f172a;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#cbd5e1;line-height:1.6;">
                <strong style="color:#f8fafc;">${escapeHtml(empresa)}</strong>
              </p>
              <p style="margin:0;font-size:11px;color:#64748b;line-height:1.5;">
                Mensaje enviado desde el sistema de cotizaciones.<br />
                La información contenida es de carácter comercial y confidencial.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html, inlineAttachments };
}

function getDefaultEmailContent({ quote, emisor }) {
  const { subject } = buildQuoteEmail({ quote, emisor });
  return { subject, message: DEFAULT_INTRO };
}

module.exports = {
  buildQuoteEmail,
  getDefaultEmailContent,
  DEFAULT_INTRO,
  formatMoney,
  formatDate,
};
