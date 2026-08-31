
import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT || 587);

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,

  port: smtpPort,

  secure: smtpPort === 465,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

type SendPasswordResetEmailParams = {
  email: string;
  name: string | null;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  email,
  name,
  resetUrl,
}: SendPasswordResetEmailParams) {
  const displayName = name?.trim() || "користувачу";

  await transporter.sendMail({
    from: process.env.MAIL_FROM,

    to: email,

    subject: "Відновлення пароля — UkrTradeHub",

    text: `
Вітаємо, ${displayName}!

Ми отримали запит на відновлення пароля для вашого акаунта UkrTradeHub.

Перейдіть за посиланням:

${resetUrl}

Якщо ви не надсилали цей запит, просто проігноруйте цей лист.

UkrTradeHub
    `.trim(),

    html: `
      <div
        style="
          max-width:600px;
          margin:0 auto;
          padding:40px;
          background:#080b11;
          color:#ffffff;
          font-family:Arial,sans-serif;
        "
      >
        <h1
          style="
            margin:0 0 24px;
            font-size:28px;
          "
        >
          Ukr<span style="color:#fbbf24">Trade</span>Hub
        </h1>

        <h2 style="font-size:24px">
          Відновлення пароля
        </h2>

        <p
          style="
            color:#a1a1aa;
            line-height:1.7;
          "
        >
          Вітаємо, ${displayName}!
        </p>

        <p
          style="
            color:#a1a1aa;
            line-height:1.7;
          "
        >
          Ми отримали запит на відновлення пароля для вашого
          акаунта UkrTradeHub.
        </p>

        <a
          href="${resetUrl}"
          style="
            display:inline-block;
            margin:24px 0;
            padding:14px 24px;
            background:#fbbf24;
            color:#000000;
            border-radius:10px;
            font-weight:bold;
            text-decoration:none;
          "
        >
          Відновити пароль
        </a>

        <p
          style="
            color:#71717a;
            font-size:14px;
            line-height:1.7;
          "
        >
          Якщо ви не надсилали цей запит, просто проігноруйте
          цей лист.
        </p>
      </div>
    `,
  });
}

