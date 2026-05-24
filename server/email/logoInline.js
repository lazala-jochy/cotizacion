/**
 * Convierte logo data-URL de Empresa en adjunto inline (CID) para clientes de correo.
 */
function parseLogoDataUrl(logo) {
  if (!logo || typeof logo !== 'string') return null;
  const trimmed = logo.trim();
  const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;

  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) return null;

  const ext = contentType.includes('png') ? 'png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';

  return {
    filename: `logo-empresa.${ext}`,
    content: buffer,
    cid: 'empresa-logo@cotizacion',
    contentType,
    contentDisposition: 'inline',
  };
}

module.exports = { parseLogoDataUrl };
