export function isImageMime(mime) {
  const m = String(mime || '').toLowerCase();
  return m === 'image/jpeg' || m === 'image/jpg' || m === 'image/png';
}

export function isPdfMime(mime) {
  return String(mime || '').toLowerCase() === 'application/pdf';
}

export function expenseHasAttachment(expense) {
  return Boolean(
    expense?.attachment_data ||
      expense?.attachment_name ||
      expense?.has_attachment
  );
}

export function getAttachmentSource(expenseOrAttachment) {
  if (!expenseOrAttachment) return null;
  const data = expenseOrAttachment.attachment_data;
  const mime = expenseOrAttachment.attachment_mime;
  const name = expenseOrAttachment.attachment_name;
  if (!data) return null;
  return { data, mime, name };
}
