
import {
  emailTransporter,
  MAIL_FROM,
} from "./transport";

import {
  welcomeTemplate,
  orderConfirmationTemplate,
  orderStatusTemplate,
  deliveryTemplate,
  orderCancelledTemplate,
  passwordResetTemplate,
} from "./templates";

import {
  DeliveryEmailData,
  EmailUser,
  OrderEmailData,
  OrderStatusEmailData,
  PasswordResetEmailData,
} from "./types";

export class EmailService {
  private static async send({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    if (!to?.trim()) {
      throw new Error(
        "Email recipient is required"
      );
    }

    return emailTransporter.sendMail({
      from: MAIL_FROM,
      to: to.trim().toLowerCase(),
      subject,
      html,
      text,
    });
  }

  static async sendEmailVerification({
    email,
    name,
    verificationUrl,
  }: {
    email: string;
    name: string | null;
    verificationUrl: string;
  }) {
    const displayName =
      name?.trim() || "користувачу";

    const subject =
      "Підтвердіть електронну адресу — UkrTradeHub";

    const text = `
Вітаємо, ${displayName}!

Дякуємо за реєстрацію на UkrTradeHub.

Щоб завершити створення акаунта, підтвердьте вашу електронну адресу, перейшовши за посиланням:

${verificationUrl}

Посилання дійсне протягом 24 годин.

Якщо ви не реєструвалися на UkrTradeHub, просто проігноруйте цей лист.

UkrTradeHub
https://ukrtradehub.com
`.trim();

    const html = `
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>Підтвердження email</title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background: #0f172a;
    font-family: Arial, Helvetica, sans-serif;
    color: #e5e7eb;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      width: 100%;
      background: #0f172a;
      padding: 32px 16px;
    "
  >
    <tr>
      <td align="center">
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            width: 100%;
            max-width: 620px;
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 16px;
            overflow: hidden;
          "
        >
          <tr>
            <td
              style="
                padding: 28px 32px;
                background: #0b1220;
                border-bottom: 1px solid #1f2937;
              "
            >
              <div
                style="
                  font-size: 26px;
                  font-weight: 700;
                  color: #ffffff;
                "
              >
                Ukr<span style="color: #f59e0b;">Trade</span>Hub
              </div>

              <div
                style="
                  margin-top: 6px;
                  font-size: 13px;
                  color: #94a3b8;
                "
              >
                Marketplace Ukraine
              </div>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding: 36px 32px;
              "
            >
              <h1
                style="
                  margin: 0 0 18px;
                  font-size: 26px;
                  line-height: 1.25;
                  color: #ffffff;
                "
              >
                Підтвердіть вашу електронну адресу
              </h1>

              <p
                style="
                  margin: 0 0 16px;
                  font-size: 16px;
                  line-height: 1.7;
                  color: #cbd5e1;
                "
              >
                Вітаємо, ${displayName}!
              </p>

              <p
                style="
                  margin: 0 0 26px;
                  font-size: 16px;
                  line-height: 1.7;
                  color: #cbd5e1;
                "
              >
                Дякуємо за реєстрацію на UkrTradeHub.
                Щоб завершити створення акаунта,
                підтвердьте вашу електронну адресу.
              </p>

              <table
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="margin: 0 0 28px;"
              >
                <tr>
                  <td
                    align="center"
                    bgcolor="#f59e0b"
                    style="
                      border-radius: 10px;
                    "
                  >
                    <a
                      href="${verificationUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="
                        display: inline-block;
                        padding: 15px 24px;
                        font-size: 16px;
                        font-weight: 700;
                        line-height: 1;
                        color: #111827;
                        text-decoration: none;
                      "
                    >
                      Підтвердити email
                    </a>
                  </td>
                </tr>
              </table>

              <p
                style="
                  margin: 0 0 12px;
                  font-size: 14px;
                  line-height: 1.6;
                  color: #94a3b8;
                "
              >
                Посилання дійсне протягом 24 годин.
              </p>

              <p
                style="
                  margin: 0 0 12px;
                  font-size: 14px;
                  line-height: 1.6;
                  color: #94a3b8;
                "
              >
                Якщо кнопка не працює, скопіюйте це
                посилання у браузер:
              </p>

              <p
                style="
                  margin: 0;
                  word-break: break-all;
                  font-size: 13px;
                  line-height: 1.6;
                "
              >
                <a
                  href="${verificationUrl}"
                  style="
                    color: #f59e0b;
                    text-decoration: none;
                  "
                >
                  ${verificationUrl}
                </a>
              </p>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding: 24px 32px;
                background: #0b1220;
                border-top: 1px solid #1f2937;
              "
            >
              <p
                style="
                  margin: 0 0 8px;
                  font-size: 13px;
                  line-height: 1.6;
                  color: #64748b;
                "
              >
                Якщо ви не створювали акаунт на
                UkrTradeHub, просто проігноруйте цей лист.
              </p>

              <p
                style="
                  margin: 0;
                  font-size: 13px;
                  color: #64748b;
                "
              >
                © UkrTradeHub
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

    return this.send({
      to: email,
      subject,
      html,
      text,
    });
  }

  static async sendWelcome(
    user: EmailUser
  ) {
    const template =
      welcomeTemplate(user.name);

    return this.send({
      to: user.email,
      ...template,
    });
  }

  static async sendOrderConfirmation(
    user: EmailUser,
    order: OrderEmailData
  ) {
    const template =
      orderConfirmationTemplate({
        ...order,
        customerName:
          order.customerName ??
          user.name,
      });

    return this.send({
      to: user.email,
      ...template,
    });
  }

  static async sendOrderStatusUpdate(
    user: EmailUser,
    order: OrderStatusEmailData
  ) {
    const template =
      orderStatusTemplate({
        ...order,
        customerName:
          order.customerName ??
          user.name,
      });

    return this.send({
      to: user.email,
      ...template,
    });
  }

  static async sendDeliveryUpdate(
    user: EmailUser,
    delivery: DeliveryEmailData
  ) {
    const template =
      deliveryTemplate({
        ...delivery,
        customerName:
          delivery.customerName ??
          user.name,
      });

    return this.send({
      to: user.email,
      ...template,
    });
  }

  static async sendOrderCancelled(
    user: EmailUser,
    order: OrderStatusEmailData
  ) {
    const template =
      orderCancelledTemplate({
        ...order,
        customerName:
          order.customerName ??
          user.name,
      });

    return this.send({
      to: user.email,
      ...template,
    });
  }

  static async sendPasswordReset(
    user: EmailUser,
    data: Omit<
      PasswordResetEmailData,
      "name"
    >
  ) {
    const template =
      passwordResetTemplate({
        ...data,
        name: user.name,
      });

    return this.send({
      to: user.email,
      ...template,
    });
  }

  static async verifyConnection() {
    return emailTransporter.verify();
  }
}

export {
  welcomeTemplate,
  orderConfirmationTemplate,
  orderStatusTemplate,
  deliveryTemplate,
  orderCancelledTemplate,
  passwordResetTemplate,
};

export * from "./types";