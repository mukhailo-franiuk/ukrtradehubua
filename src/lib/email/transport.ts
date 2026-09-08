import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = process.env.SMTP_SECURE !== "false";
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;

if (!smtpHost || !smtpUser || !smtpPassword) {
  throw new Error("SMTP environment variables are not configured");
}

export const emailTransporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,

  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },

  pool: true,
  maxConnections: 5,
  maxMessages: 100,

  connectionTimeout: 20_000,
  greetingTimeout: 20_000,
  socketTimeout: 60_000,
});

export const MAIL_FROM =
  process.env.MAIL_FROM ||
  `"UkrTradeHub" <${smtpUser}>`;