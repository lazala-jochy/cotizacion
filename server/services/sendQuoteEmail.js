const nodemailer = require('nodemailer');

function createGmailTransport({ user, password }) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass: password },
  });
}

/**
 * @param {{ user: string, password: string }} smtp
 * @param {{
 *   to: string,
 *   subject: string,
 *   text: string,
 *   html: string,
 *   attachments?: object[],
 *   inlineAttachments?: object[],
 *   fromName?: string,
 * }} mail
 */
async function sendQuoteEmail(smtp, mail) {
  const transport = createGmailTransport(smtp);
  const attachments = [...(mail.inlineAttachments || []), ...(mail.attachments || [])];

  return transport.sendMail({
    from: `"${mail.fromName || 'Cotizaciones'}" <${smtp.user}>`,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    attachments,
  });
}

module.exports = { sendQuoteEmail, createGmailTransport };
