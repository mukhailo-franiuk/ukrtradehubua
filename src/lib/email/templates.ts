import {
  DeliveryEmailData,
  OrderEmailData,
  OrderStatusEmailData,
  PasswordResetEmailData,
} from "./types";

import {
  escapeHtml,
  formatMoney,
  safeName,
} from "./utils";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://ukrtradehub.com";

const BRAND_YELLOW = "#fbbf24";

function baseTemplate({
  title,
  preview,
  content,
}: {
  title: string;
  preview?: string;
  content: string;
}) {
  return `
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>${escapeHtml(title)}</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background: #070b12;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color: #f8fafc;
    }

    a {
      color: inherit;
    }
  </style>
</head>

<body>

  ${
    preview
      ? `
      <div
        style="
          display:none;
          max-height:0;
          overflow:hidden;
          opacity:0;
        "
      >
        ${escapeHtml(preview)}
      </div>
      `
      : ""
  }

  <div
    style="
      width:100%;
      padding:40px 16px;
      box-sizing:border-box;
      background:#070b12;
    "
  >

    <div
      style="
        max-width:640px;
        margin:0 auto;
      "
    >

      <!-- LOGO -->

      <div
        style="
          text-align:center;
          margin-bottom:24px;
        "
      >
        <a
          href="${SITE_URL}"
          style="
            text-decoration:none;
            font-size:28px;
            font-weight:900;
            letter-spacing:-1px;
          "
        >
          <span style="color:#ffffff;">Ukr</span><span
            style="color:${BRAND_YELLOW};"
          >Trade</span><span
            style="color:#ffffff;"
          >Hub</span>
        </a>
      </div>

      <!-- CARD -->

      <div
        style="
          background:#111827;
          border:1px solid #1f2937;
          border-radius:24px;
          overflow:hidden;
        "
      >

        ${content}

        <!-- FOOTER -->

        <div
          style="
            padding:24px 32px;
            border-top:1px solid #1f2937;
            text-align:center;
          "
        >

          <p
            style="
              margin:0 0 8px;
              color:#64748b;
              font-size:13px;
            "
          >
            UkrTradeHub — український маркетплейс
          </p>

          <p
            style="
              margin:0;
              color:#475569;
              font-size:12px;
            "
          >
            support@ukrtradehub.com
          </p>

        </div>

      </div>

      <p
        style="
          margin:22px 0 0;
          text-align:center;
          color:#475569;
          font-size:11px;
          line-height:1.6;
        "
      >
        Це автоматичний лист від UkrTradeHub.
        Будь ласка, не відповідайте на нього.
      </p>

    </div>

  </div>

</body>
</html>
`;
}

function headerBlock(
  icon: string,
  title: string,
  subtitle: string
) {
  return `
    <div
      style="
        padding:42px 32px 28px;
        text-align:center;
        background:
          linear-gradient(
            180deg,
            #172033 0%,
            #111827 100%
          );
      "
    >

      <div
        style="
          width:72px;
          height:72px;
          margin:0 auto 22px;
          border-radius:50%;
          background:${BRAND_YELLOW};
          color:#111827;
          font-size:34px;
          line-height:72px;
        "
      >
        ${icon}
      </div>

      <h1
        style="
          margin:0;
          color:#ffffff;
          font-size:29px;
          line-height:1.2;
        "
      >
        ${title}
      </h1>

      <p
        style="
          margin:14px 0 0;
          color:#94a3b8;
          font-size:15px;
          line-height:1.6;
        "
      >
        ${subtitle}
      </p>

    </div>
  `;
}

function button(
  text: string,
  url: string
) {
  return `
    <div
      style="
        text-align:center;
        margin:32px 0 10px;
      "
    >
      <a
        href="${url}"
        style="
          display:inline-block;
          padding:15px 28px;
          background:${BRAND_YELLOW};
          color:#111827;
          text-decoration:none;
          font-size:15px;
          font-weight:800;
          border-radius:12px;
        "
      >
        ${escapeHtml(text)}
      </a>
    </div>
  `;
}

function orderItemsBlock(
  items: OrderEmailData["items"]
) {
  if (!items?.length) {
    return "";
  }

  return `
    <div
      style="
        margin:24px 0;
        background:#0f172a;
        border-radius:16px;
        overflow:hidden;
      "
    >

      ${items
        .map((item) => {
          const price = formatMoney(
            item.price
          );

          return `
            <div
              style="
                padding:16px 18px;
                border-bottom:1px solid #1e293b;
              "
            >

              <div
                style="
                  color:#f8fafc;
                  font-size:14px;
                  font-weight:700;
                "
              >
                ${escapeHtml(item.name)}
              </div>

              <div
                style="
                  margin-top:6px;
                  color:#94a3b8;
                  font-size:13px;
                "
              >
                Кількість: ${item.quantity}
                ${
                  price
                    ? ` · ${price}`
                    : ""
                }
              </div>

            </div>
          `;
        })
        .join("")}

    </div>
  `;
}

export function welcomeTemplate(
  name?: string | null
) {
  const userName = safeName(name);

  return {
    subject:
      "🎉 Ласкаво просимо до UkrTradeHub!",

    text: `
Вітаємо, ${name || "друже"}!

Ваш акаунт UkrTradeHub успішно створено.

Переходьте на:
${SITE_URL}

З повагою,
команда UkrTradeHub
`.trim(),

    html: baseTemplate({
      title:
        "Ласкаво просимо до UkrTradeHub!",

      preview:
        "Ваш акаунт UkrTradeHub успішно створено.",

      content: `
        ${headerBlock(
          "✓",
          "Ласкаво просимо!",
          "Ваш акаунт UkrTradeHub успішно створено."
        )}

        <div style="padding:32px;">

          <p
            style="
              margin:0 0 20px;
              color:#ffffff;
              font-size:18px;
              line-height:1.6;
            "
          >
            Вітаємо,
            <strong>${userName}</strong>! 👋
          </p>

          <p
            style="
              margin:0;
              color:#cbd5e1;
              font-size:15px;
              line-height:1.8;
            "
          >
            Дякуємо, що приєдналися до
            <strong style="color:${BRAND_YELLOW};">
              UkrTradeHub
            </strong>
            — українського маркетплейсу,
            де можна знаходити цікаві товари
            та відкривати нові магазини.
          </p>

          <div
            style="
              margin:24px 0;
              padding:20px;
              background:#0f172a;
              border-radius:16px;
            "
          >

            <p style="margin:0 0 14px;color:#e2e8f0;">
              🛍️ Знаходьте цікаві товари
            </p>

            <p style="margin:0 0 14px;color:#e2e8f0;">
              🏪 Відкривайте українські магазини
            </p>

            <p style="margin:0 0 14px;color:#e2e8f0;">
              ❤️ Додавайте товари до обраного
            </p>

            <p style="margin:0;color:#e2e8f0;">
              📦 Створюйте та відстежуйте замовлення
            </p>

          </div>

          ${button(
            "Перейти до UkrTradeHub",
            SITE_URL
          )}

        </div>
      `,
    }),
  };
}

export function orderConfirmationTemplate(
  data: OrderEmailData
) {
  const orderNumber =
    escapeHtml(data.orderId);

  const total = formatMoney(
    data.total,
    data.currency || "UAH"
  );

  return {
    subject:
      `🛍️ Замовлення #${data.orderId} прийнято`,

    text: `
Ваше замовлення #${data.orderId} успішно створено.

${total ? `Сума: ${total}` : ""}

Переглянути замовлення:
${SITE_URL}/account/orders
`.trim(),

    html: baseTemplate({
      title: "Замовлення прийнято",

      preview:
        `Замовлення #${data.orderId} успішно створено.`,

      content: `
        ${headerBlock(
          "✓",
          "Замовлення прийнято",
          `Замовлення #${orderNumber} успішно створено.`
        )}

        <div style="padding:32px;">

          <p
            style="
              margin:0 0 20px;
              color:#ffffff;
              font-size:17px;
            "
          >
            Вітаємо,
            <strong>
              ${safeName(data.customerName)}
            </strong>!
          </p>

          ${orderItemsBlock(data.items)}

          ${
            total
              ? `
                <div
                  style="
                    margin-top:24px;
                    padding:20px;
                    background:#0f172a;
                    border-radius:16px;
                    text-align:center;
                  "
                >
                  <div
                    style="
                      color:#64748b;
                      font-size:13px;
                    "
                  >
                    Разом
                  </div>

                  <div
                    style="
                      margin-top:6px;
                      color:${BRAND_YELLOW};
                      font-size:26px;
                      font-weight:900;
                    "
                  >
                    ${total}
                  </div>
                </div>
              `
              : ""
          }

          ${button(
            "Переглянути замовлення",
            `${SITE_URL}/account/orders`
          )}

        </div>
      `,
    }),
  };
}

export function orderStatusTemplate(
  data: OrderStatusEmailData
) {
  const statusLabel =
    escapeHtml(data.statusLabel);

  const message = data.message
    ? escapeHtml(data.message)
    : "";

  const total = formatMoney(
    data.total,
    data.currency || "UAH"
  );

  return {
    subject:
      `📦 Оновлення замовлення #${data.orderId}`,

    text: `
Статус замовлення #${data.orderId} змінено.

Новий статус:
${data.statusLabel}

${data.message || ""}

${total ? `Сума: ${total}` : ""}
`.trim(),

    html: baseTemplate({
      title:
        "Оновлення замовлення",

      preview:
        `Статус замовлення #${data.orderId}: ${data.statusLabel}`,

      content: `
        ${headerBlock(
          "↻",
          "Статус оновлено",
          `Замовлення #${escapeHtml(data.orderId)}`
        )}

        <div style="padding:32px;">

          <p
            style="
              margin:0 0 22px;
              color:#cbd5e1;
              font-size:15px;
              line-height:1.7;
            "
          >
            Вітаємо,
            <strong style="color:#ffffff;">
              ${safeName(data.customerName)}
            </strong>.
          </p>

          <div
            style="
              padding:22px;
              background:#0f172a;
              border-radius:16px;
              text-align:center;
            "
          >

            <div
              style="
                color:#64748b;
                font-size:13px;
              "
            >
              Новий статус
            </div>

            <div
              style="
                margin-top:8px;
                color:${BRAND_YELLOW};
                font-size:23px;
                font-weight:900;
              "
            >
              ${statusLabel}
            </div>

          </div>

          ${
            message
              ? `
                <p
                  style="
                    margin:22px 0 0;
                    color:#cbd5e1;
                    font-size:15px;
                    line-height:1.7;
                  "
                >
                  ${message}
                </p>
              `
              : ""
          }

          ${
            total
              ? `
                <p
                  style="
                    margin:20px 0 0;
                    color:#94a3b8;
                  "
                >
                  Сума замовлення:
                  <strong style="color:#ffffff;">
                    ${total}
                  </strong>
                </p>
              `
              : ""
          }

          ${button(
            "Відкрити замовлення",
            `${SITE_URL}/account/orders`
          )}

        </div>
      `,
    }),
  };
}

export function deliveryTemplate(
  data: DeliveryEmailData
) {
  return {
    subject:
      `🚚 Замовлення #${data.orderId} передано в доставку`,

    text: `
Ваше замовлення #${data.orderId} передано в доставку.

${
  data.trackingNumber
    ? `Номер відправлення: ${data.trackingNumber}`
    : ""
}

${
  data.deliveryMethod
    ? `Спосіб доставки: ${data.deliveryMethod}`
    : ""
}

${
  data.deliveryAddress
    ? `Адреса: ${data.deliveryAddress}`
    : ""
}

${SITE_URL}/account/orders
`.trim(),

    html: baseTemplate({
      title: "Замовлення в дорозі",

      preview:
        `Замовлення #${data.orderId} передано в доставку.`,

      content: `
        ${headerBlock(
          "🚚",
          "Замовлення в дорозі",
          `Замовлення #${escapeHtml(data.orderId)} передано в доставку.`
        )}

        <div style="padding:32px;">

          <p
            style="
              margin:0 0 22px;
              color:#cbd5e1;
              font-size:15px;
              line-height:1.7;
            "
          >
            Вітаємо,
            <strong style="color:#ffffff;">
              ${safeName(data.customerName)}
            </strong>!
          </p>

          <div
            style="
              padding:22px;
              background:#0f172a;
              border-radius:16px;
            "
          >

            ${
              data.trackingNumber
                ? `
                  <p
                    style="
                      margin:0 0 14px;
                      color:#cbd5e1;
                    "
                  >
                    📦 Номер відправлення:
                    <strong style="color:#ffffff;">
                      ${escapeHtml(
                        data.trackingNumber
                      )}
                    </strong>
                  </p>
                `
                : ""
            }

            ${
              data.deliveryMethod
                ? `
                  <p
                    style="
                      margin:0 0 14px;
                      color:#cbd5e1;
                    "
                  >
                    🚚 Доставка:
                    <strong style="color:#ffffff;">
                      ${escapeHtml(
                        data.deliveryMethod
                      )}
                    </strong>
                  </p>
                `
                : ""
            }

            ${
              data.deliveryAddress
                ? `
                  <p
                    style="
                      margin:0;
                      color:#cbd5e1;
                    "
                  >
                    📍 Адреса:
                    <strong style="color:#ffffff;">
                      ${escapeHtml(
                        data.deliveryAddress
                      )}
                    </strong>
                  </p>
                `
                : ""
            }

          </div>

          ${
            data.estimatedDelivery
              ? `
                <p
                  style="
                    margin:20px 0 0;
                    color:#94a3b8;
                  "
                >
                  Орієнтовна доставка:
                  <strong style="color:#ffffff;">
                    ${escapeHtml(
                      data.estimatedDelivery
                    )}
                  </strong>
                </p>
              `
              : ""
          }

          ${button(
            "Переглянути замовлення",
            `${SITE_URL}/account/orders`
          )}

        </div>
      `,
    }),
  };
}

export function orderCancelledTemplate(
  data: OrderStatusEmailData
) {
  const message = data.message
    ? escapeHtml(data.message)
    : "";

  return {
    subject:
      `❌ Замовлення #${data.orderId} скасовано`,

    text: `
Замовлення #${data.orderId} скасовано.

${data.message || ""}

Якщо у вас залишилися питання:
support@ukrtradehub.com
`.trim(),

    html: baseTemplate({
      title:
        "Замовлення скасовано",

      preview:
        `Замовлення #${data.orderId} було скасовано.`,

      content: `
        ${headerBlock(
          "×",
          "Замовлення скасовано",
          `Замовлення #${escapeHtml(data.orderId)}`
        )}

        <div style="padding:32px;">

          <p
            style="
              margin:0 0 20px;
              color:#cbd5e1;
              font-size:15px;
              line-height:1.7;
            "
          >
            Вітаємо,
            <strong style="color:#ffffff;">
              ${safeName(data.customerName)}
            </strong>.
          </p>

          <div
            style="
              padding:22px;
              background:#0f172a;
              border-radius:16px;
            "
          >

            <p
              style="
                margin:0;
                color:#fca5a5;
                font-size:15px;
                line-height:1.7;
              "
            >
              На жаль, ваше замовлення було скасовано.
            </p>

            ${
              message
                ? `
                  <p
                    style="
                      margin:16px 0 0;
                      color:#cbd5e1;
                      line-height:1.7;
                    "
                  >
                    ${message}
                  </p>
                `
                : ""
            }

          </div>

          <p
            style="
              margin:24px 0 0;
              color:#94a3b8;
              font-size:14px;
              line-height:1.7;
            "
          >
            Якщо ви вважаєте, що це сталося помилково,
            зверніться до служби підтримки:
            <strong style="color:#ffffff;">
              support@ukrtradehub.com
            </strong>
          </p>

          ${button(
            "Перейти до UkrTradeHub",
            SITE_URL
          )}

        </div>
      `,
    }),
  };
}

export function passwordResetTemplate(
  data: PasswordResetEmailData
) {
  const expires =
    data.expiresIn || "1 годину";

  return {
    subject:
      "🔐 Відновлення пароля UkrTradeHub",

    text: `
Вітаємо, ${data.name || "друже"}!

Ми отримали запит на скидання пароля вашого акаунта UkrTradeHub.

Посилання для зміни пароля:
${data.resetUrl}

Посилання дійсне протягом ${expires}.

Якщо ви не запитували відновлення пароля, просто проігноруйте цей лист.

UkrTradeHub
`.trim(),

    html: baseTemplate({
      title:
        "Відновлення пароля",

      preview:
        "Посилання для зміни пароля UkrTradeHub.",

      content: `
        ${headerBlock(
          "🔐",
          "Відновлення пароля",
          "Ми отримали запит на зміну пароля вашого акаунта."
        )}

        <div style="padding:32px;">

          <p
            style="
              margin:0 0 22px;
              color:#cbd5e1;
              font-size:15px;
              line-height:1.7;
            "
          >
            Вітаємо,
            <strong style="color:#ffffff;">
              ${safeName(data.name)}
            </strong>!
          </p>

          <p
            style="
              margin:0;
              color:#cbd5e1;
              font-size:15px;
              line-height:1.8;
            "
          >
            Ви або хтось інший запросив
            скидання пароля вашого акаунта.
            Натисніть кнопку нижче, щоб створити
            новий пароль.
          </p>

          ${button(
            "Змінити пароль",
            data.resetUrl
          )}

          <div
            style="
              margin-top:24px;
              padding:18px;
              background:#0f172a;
              border-radius:14px;
            "
          >

            <p
              style="
                margin:0;
                color:#94a3b8;
                font-size:13px;
                line-height:1.7;
              "
            >
              ⏱ Посилання дійсне протягом
              <strong style="color:#ffffff;">
                ${escapeHtml(expires)}
              </strong>.
            </p>

          </div>

          <p
            style="
              margin:24px 0 0;
              color:#64748b;
              font-size:12px;
              line-height:1.7;
            "
          >
            Якщо ви не запитували скидання пароля,
            просто проігноруйте цей лист.
            Ваш поточний пароль залишиться без змін.
          </p>

        </div>
      `,
    }),
  };
}