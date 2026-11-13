import "server-only";
import nodemailer from "nodemailer";

/**
 * Transactional mail via SMTP (works with Resend, Postmark, SES, Mailgun SMTP endpoints).
 * When SMTP_URL is not configured, messages are logged instead of sent (development).
 */
export async function sendMail(msg: { to: string; subject: string; text: string; replyTo?: string }) {
  const smtp = process.env.SMTP_URL;
  const from = process.env.MAIL_FROM || "Website <no-reply@localhost>";
  if (!smtp) {
    console.info(`[mail:dev] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return { delivered: false as const };
  }
  const transport = nodemailer.createTransport(smtp);
  await transport.sendMail({ from, ...msg });
  return { delivered: true as const };
}
