const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.MAIL_HOST || 'smtp.hostinger.com',
      port:   parseInt(process.env.MAIL_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log('[mailer] skipped (no credentials):', subject, '→', to);
    return;
  }
  return getTransporter().sendMail({
    from: process.env.MAIL_FROM || 'Greenvaley Junior College <office@greenvaley.ac.in>',
    to, subject, html, text,
  });
}

module.exports = { sendMail };
