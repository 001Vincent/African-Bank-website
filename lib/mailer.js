import nodemailer from "nodemailer";

let cachedTransporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return cachedTransporter;
}

// Sends a transaction receipt email. If SMTP isn't configured (no SMTP_HOST env var),
// this quietly logs to the console instead of failing the transaction — deposits and
// withdrawals should never be blocked by email delivery.
export async function sendTransactionEmail({ to, subject, text, html }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[email skipped — SMTP not configured] To: ${to} | Subject: ${subject}`);
    return { sent: false, reason: "smtp_not_configured" };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "Unions Africa Bank <no-reply@unionsafricabank.test>",
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("Failed to send transaction email:", err);
    return { sent: false, reason: "send_failed" };
  }
}
