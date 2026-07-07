import nodemailer from "nodemailer";

const envValue = (...keys) => {
  for (const key of keys) {
    const value = String(process.env[key] || "").trim();
    if (value) {
      return value;
    }
  }

  return "";
};

const getPort = (value) => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
};

const smtpConfig = {
  host: envValue("SMTP_HOST"),
  port: getPort(envValue("SMTP_PORT")),
  user: envValue("SMTP_USER", "EMAIL_USER"),
  pass: envValue("SMTP_PASS", "EMAIL_PASS"),
  from: envValue("SMTP_FROM", "EMAIL_FROM", "SMTP_USER", "EMAIL_USER"),
};

const requiredSmtpKeys = [
  ["SMTP_HOST"],
  ["SMTP_USER", "EMAIL_USER"],
  ["SMTP_PASS", "EMAIL_PASS"],
  ["SMTP_FROM", "EMAIL_FROM", "SMTP_USER", "EMAIL_USER"],
];

const getMissingSmtpKeys = () => {
  const missingKeys = requiredSmtpKeys
    .filter((keys) => !envValue(...keys))
    .map((keys) => keys.join(" or "));

  if (smtpConfig.port === null) {
    missingKeys.push("SMTP_PORT");
  }

  return missingKeys;
};

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
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: process.env.SMTP_SECURE === "true" || smtpConfig.port === 465,
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 15000),
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    })
  : null;

export const smtpFrom = smtpConfig.from;

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
