const nodemailer = require('nodemailer');

// SMTP settings come from .env. Any SMTP provider works; we use Brevo's free
// plan (smtp-relay.brevo.com:587). MAIL_FROM must be a sender verified there.
const isMailConfigured = () =>
  !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const sendMail = ({ to, subject, text, html }) =>
  getTransporter().sendMail({
    from: process.env.MAIL_FROM || `QuizApp <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });

module.exports = { isMailConfigured, sendMail };
