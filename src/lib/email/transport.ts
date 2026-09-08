
import nodemailer from "nodemailer";

function getSmtpConfig() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(
    process.env.SMTP_PORT || 465
  );
  const smtpSecure =
    process.env.SMTP_SECURE !== "false";
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword =
    process.env.SMTP_PASSWORD;

  if (
    !smtpHost ||
    !smtpUser ||
    !smtpPassword
  ) {
    throw new Error(
      "SMTP environment variables are not configured"
    );
  }

  return {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  };
}

/**
 * Створюємо transporter тільки тоді,
 * коли він реально потрібен.
 *
 * Це важливо для Next.js build:
 * SMTP env не повинні бути обов'язковими
 * під час module evaluation.
 */
export const emailTransporter = {
  sendMail(
    options: nodemailer.SendMailOptions
  ) {
    const transporter =
      nodemailer.createTransport(
        getSmtpConfig()
      );

    return transporter.sendMail(options);
  },

  verify() {
    const transporter =
      nodemailer.createTransport(
        getSmtpConfig()
      );

    return transporter.verify();
  },
};

export const MAIL_FROM =
  process.env.MAIL_FROM ||
  `"UkrTradeHub" <support@ukrtradehub.com>`;