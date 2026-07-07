import { smtpFrom, transporter } from "../config/smtp.js";

export const EMAIL_NOT_CONFIGURED_MESSAGE = "Email service is not configured";

export class EmailServiceError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "EmailServiceError";
    this.code = "EMAIL_SERVICE_ERROR";
    this.cause = cause;
  }
}

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    throw new EmailServiceError(EMAIL_NOT_CONFIGURED_MESSAGE);
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error(`[email] Failed to send email: ${error.message}`);
    throw new EmailServiceError("Email could not be sent", error);
  }
};
