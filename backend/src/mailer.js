const nodemailer = require('nodemailer');

function buildTransport() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: String(process.env.SMTP_SECURE || 'true') === 'true' || port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

let transporter = null;
function getTransporter() {
  if (!transporter) transporter = buildTransport();
  return transporter;
}

async function verifyConnection() {
  const t = getTransporter();
  await t.verify();
}

/**
 * Send an email.
 * @param {Object} opts
 * @param {string} opts.to - recipient email address
 * @param {string} opts.subject
 * @param {string} [opts.html] - HTML body
 * @param {string} [opts.text] - plain-text fallback body
 * @param {Array<{filename:string, content:string, encoding?:string, contentType?:string}>} [opts.attachments]
 *   content should be a base64 string when encoding is 'base64' (the default expected from the frontend for PDFs).
 */
async function sendMail({ to, subject, html, text, attachments = [] }) {
  if (!to) throw new Error('Missing "to" address');
  if (!subject) throw new Error('Missing "subject"');
  if (!html && !text) throw new Error('Missing "html" or "text" body');

  const t = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'BIMDEC Document System';
  const fromAddress = process.env.SMTP_USER;

  const info = await t.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
    text: text || undefined,
    attachments: attachments.map(a => ({
      filename: a.filename,
      content: a.content,
      encoding: a.encoding || 'base64',
      contentType: a.contentType || undefined,
    })),
  });

  return info;
}

module.exports = { getTransporter, verifyConnection, sendMail };
