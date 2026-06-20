import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 587);

  if (smtpHost) {
    if (!smtpUser || !smtpPass) {
      throw new Error("SMTP email delivery is not configured. Please set SMTP_USER and SMTP_PASS.");
    }

    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 15000),
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    return transporter;
  }

  if (!smtpUser || !smtpPass) {
    throw new Error("Email delivery is not configured. Please set SMTP_* or EMAIL_USER and EMAIL_PASS.");
  }

  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 15000),
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const mailTransporter = getTransporter();

  await mailTransporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  });
};
