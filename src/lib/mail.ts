
import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(
  process.env.SMTP_PORT || 465
);
const smtpSecure =
  process.env.SMTP_SECURE !== "false";
const smtpUser = process.env.SMTP_USER;
const smtpPassword =
  process.env.SMTP_PASSWORD;

export const MAIL_FROM =
  process.env.MAIL_FROM ||
  `"UkrTradeHub" <${smtpUser || "support@ukrtradehub.com"}>`;

function getMailTransporter() {
  if (
    !smtpHost ||
    !smtpUser ||
    !smtpPassword
  ) {
    throw new Error(
      "SMTP environment variables are not configured"
    );
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!to?.trim()) {
    throw new Error(
      "Email recipient is required"
    );
  }

  const transporter =
    getMailTransporter();

  return transporter.sendMail({
    from: MAIL_FROM,
    to: to.trim().toLowerCase(),
    subject,
    html,
    text,
  });
}

export async function verifyMailConnection() {
  const transporter =
    getMailTransporter();

  return transporter.verify();
}