import nodemailer from "nodemailer";

const requiredSmtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];

const getMissingSmtpKeys = () =>
  requiredSmtpKeys.filter((key) => !String(process.env[key] || "").trim());

const missingSmtpKeys = getMissingSmtpKeys();

export const isEmailConfigured = missingSmtpKeys.length === 0;

export const emailServiceStatus = isEmailConfigured ? "configured" : "not_configured";

if (!isEmailConfigured) {
  console.warn(
    `[smtp] Email service not configured. Missing ${missingSmtpKeys.join(", ")}. Server will start without SMTP.`
  );
}

export const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 15000),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export const verifySmtpConnection = async () => {
  if (!transporter) {
    console.warn("[smtp] Skipping SMTP verification because email service is not configured.");
    return false;
  }

  try {
    await transporter.verify();
    console.log("[smtp] SMTP connection verified.");
    return true;
  } catch (error) {
    console.warn(`[smtp] SMTP verification failed: ${error.message}`);
    return false;
  }
};
