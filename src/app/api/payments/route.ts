import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createMonoInvoice } from "@/lib/payments/monobank";

export const runtime = "nodejs";

const ONLINE_METHODS = [
  PaymentMethod.CARD,
  PaymentMethod.APPLE_PAY,
  PaymentMethod.GOOGLE_PAY,
] as const;

const LOCAL_METHODS = [
  PaymentMethod.CASH_ON_DELIVERY,
  PaymentMethod.BANK_TRANSFER,
] as const;

function isOnlineMethod(method: PaymentMethod): boolean {
  return ONLINE_METHODS.includes(
    method as (typeof ONLINE_METHODS)[number],
  );
}

function isLocalMethod(method: PaymentMethod): boolean {
  return LOCAL_METHODS.includes(
    method as (typeof LOCAL_METHODS)[number],
  );
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" &&
    Object.values(PaymentMethod).includes(value as PaymentMethod)
  );
}

function getAppUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!value) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }

  return value.replace(/\/+$/, "");
}

/**
 * Decimal / number / string -> Monobank minor units.
 *
 * Example:
 * 1299.99 UAH -> 129999
 */
function toMinorUnits(value: unknown): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Некоректна сума оплати");
  }

  const minor = Math.round(amount * 100);

  if (!Number.isSafeInteger(minor) || minor <= 0) {
    throw new Error("Сума оплати занадто велика");
  }

  return minor;
}

function jsonError(
  error: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...extra,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  try {
    /*
     * =====================================================
     * 1. AUTH
     * =====================================================
     */

    const user = await getCurrentUser();

    if (!user) {
      return jsonError("Необхідна авторизація", 401);
    }

    /*
     * =====================================================
     * 2. BODY
     * =====================================================
     */

    let body: {
      orderId?: unknown;
      method?: unknown;
    };

    try {
      body = (await request.json()) as {
        orderId?: unknown;
        method?: unknown;
      };
    } catch {
      return jsonError("Некоректне тіло запиту", 400);
    }

    const orderId =
      typeof body.orderId === "string"
        ? body.orderId.trim()
        : "";

    const methodValue =
      typeof body.method === "string"
        ? body.method.trim()
        : "";

    if (!orderId) {
      return jsonError("ID замовлення не вказано", 400);
    }

    if (!methodValue) {
      return jsonError("Спосіб оплати не вказано", 400);
    }

    if (!isPaymentMethod(methodValue)) {
      return jsonError(
        "Непідтримуваний спосіб оплати",
        400,
      );
    }

    const method = methodValue;

    /*
     * =====================================================
     * 3. LOAD ORDER
     * =====================================================
     *
     * userId обов'язковий, щоб користувач не міг
     * оплатити чуже замовлення.
     */

    const order = await db.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },

      include: {
        items: {
          orderBy: {
            createdAt: "asc",
          },
        },

        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!order) {
      return jsonError("Замовлення не знайдено", 404);
    }

    /*
     * =====================================================
     * 4. ORDER STATUS
     * =====================================================
     */

    if (order.status !== "PENDING") {
      return jsonError(
        "Для цього замовлення оплату виконати неможливо",
        400,
        {
          orderStatus: order.status,
        },
      );
    }

    /*
     * =====================================================
     * 5. ORDER ITEMS
     * =====================================================
     */

    if (order.items.length === 0) {
      return jsonError(
        "Замовлення не містить товарів",
        400,
      );
    }

    /*
     * =====================================================
     * 6. ALREADY PAID
     * =====================================================
     */

    const paidPayment = order.payments.find(
      (payment) =>
        payment.status === PaymentStatus.PAID,
    );

    if (paidPayment) {
      return jsonError(
        "Замовлення вже оплачено",
        409,
        {
          paymentId: paidPayment.id,
        },
      );
    }

    /*
     * =====================================================
     * 7. LOCAL PAYMENT
     * =====================================================
     *
     * CASH_ON_DELIVERY
     * BANK_TRANSFER
     *
     * Ці способи не потребують Monobank token.
     */

    if (isLocalMethod(method)) {
      /*
       * Якщо вже існує активний payment такого способу,
       * повертаємо його замість створення дубліката.
       */

      const existingLocalPayment =
        order.payments.find(
          (payment) =>
            payment.method === method &&
            (
              payment.status ===
                PaymentStatus.PENDING ||
              payment.status ===
                PaymentStatus.PROCESSING
            ),
        );

      if (existingLocalPayment) {
        return NextResponse.json({
          success: true,

          payment: {
            id: existingLocalPayment.id,
            status: existingLocalPayment.status,
            method: existingLocalPayment.method,
            amount: existingLocalPayment.amount,
            provider: existingLocalPayment.provider,
            transactionId:
              existingLocalPayment.transactionId,
          },

          redirect: false,
          paymentUrl: null,
        });
      }

      /*
       * Створюємо локальний payment.
       */

      const payment = await db.payment.create({
        data: {
          userId: user.id,
          orderId: order.id,
          amount: order.total,
          method,
          status: PaymentStatus.PENDING,
          provider: null,
          transactionId: null,
        },
      });

      return NextResponse.json({
        success: true,

        payment: {
          id: payment.id,
          status: payment.status,
          method: payment.method,
          amount: payment.amount,
          provider: payment.provider,
          transactionId:
            payment.transactionId,
        },

        redirect: false,
        paymentUrl: null,
      });
    }

    /*
     * =====================================================
     * 8. ONLINE PAYMENT
     * =====================================================
     *
     * CARD
     * APPLE_PAY
     * GOOGLE_PAY
     *
     * На цьому етапі потрібен Monobank.
     */

    if (!isOnlineMethod(method)) {
      return jsonError(
        "Цей спосіб оплати не підтримується",
        400,
      );
    }

    /*
     * =====================================================
     * 9. CHECK MONOBANK TOKEN
     * =====================================================
     *
     * КРИТИЧНО:
     *
     * Не можна передавати:
     *
     * MONO_TOKEN="ТУТ_ТОКЕН_MONOBANK"
     *
     * у HTTP header.
     *
     * Кирилиця викликає:
     *
     * Cannot convert argument to a ByteString
     *
     * Тому перевіряємо token ДО будь-якого виклику
     * createMonoInvoice().
     */

    const monoToken = process.env.MONO_TOKEN?.trim();

    if (!monoToken) {
      return jsonError(
        "Онлайн-оплата Monobank наразі недоступна. MONO_TOKEN ще не налаштований.",
        503,
      );
    }

    /*
     * Додаткова перевірка на випадок, якщо в .env
     * випадково залишили placeholder.
     */

    const invalidMonoTokens = [
      "ТУТ_ТОКЕН_MONOBANK",
      "YOUR_MONO_TOKEN",
      "YOUR_MONOBANK_TOKEN",
      "MONO_TOKEN",
      "CHANGE_ME",
    ];

    if (
      invalidMonoTokens.includes(monoToken)
    ) {
      return jsonError(
        "Онлайн-оплата Monobank ще не налаштована. Вкажіть реальний MONO_TOKEN.",
        503,
      );
    }

    /*
     * =====================================================
     * 10. EXISTING MONOBANK PAYMENT
     * =====================================================
     */

    const existingMonoPayment =
      order.payments.find(
        (payment) =>
          payment.provider === "MONOBANK" &&
          (
            payment.status ===
              PaymentStatus.PENDING ||
            payment.status ===
              PaymentStatus.PROCESSING
          ) &&
          !!payment.transactionId,
      );

    if (existingMonoPayment) {
      return NextResponse.json({
        success: true,

        payment: {
          id: existingMonoPayment.id,
          status: existingMonoPayment.status,
          method: existingMonoPayment.method,
          amount: existingMonoPayment.amount,
          provider: existingMonoPayment.provider,
          transactionId:
            existingMonoPayment.transactionId,
        },

        redirect: false,
        paymentUrl: null,

        existingInvoice: true,
      });
    }

    /*
     * =====================================================
     * 11. CANCEL OLD MONOBANK PAYMENTS
     * =====================================================
     */

    await db.payment.updateMany({
      where: {
        orderId: order.id,
        provider: "MONOBANK",
        status: {
          in: [
            PaymentStatus.PENDING,
            PaymentStatus.PROCESSING,
          ],
        },
        transactionId: null,
      },

      data: {
        status: PaymentStatus.CANCELLED,
      },
    });

    /*
     * =====================================================
     * 12. AMOUNT
     * =====================================================
     */

    const amountMinor =
      toMinorUnits(order.total);

    /*
     * =====================================================
     * 13. URLS
     * =====================================================
     */

    const appUrl = getAppUrl();

    const redirectUrl =
      `${appUrl}/orders/${order.id}`;

    const webHookUrl =
      `${appUrl}/api/payments/webhook/monobank`;

    /*
     * =====================================================
     * 14. CREATE PAYMENT
     * =====================================================
     */

    const payment = await db.payment.create({
      data: {
        userId: user.id,
        orderId: order.id,
        amount: order.total,
        method,
        status: PaymentStatus.PENDING,
        provider: "MONOBANK",
        transactionId: null,
      },
    });

    /*
     * =====================================================
     * 15. MONOBANK BASKET
     * =====================================================
     */

    const basketOrder = order.items.map(
      (item) => {
        const unitPrice =
          toMinorUnits(item.unitPrice);

        const total =
          unitPrice * item.quantity;

        if (
          !Number.isSafeInteger(total) ||
          total <= 0
        ) {
          throw new Error(
            `Некоректна сума товару: ${item.id}`,
          );
        }

        return {
          name: item.productTitle,
          qty: item.quantity,
          sum: unitPrice,
          total,

          ...(item.sku
            ? {
                code: item.sku,
              }
            : {}),

          unit: "шт",
        };
      },
    );

    /*
     * =====================================================
     * 16. CREATE MONOBANK INVOICE
     * =====================================================
     */

    try {
      const invoice =
        await createMonoInvoice({
          amount: amountMinor,

          reference: payment.id,

          destination:
            `Оплата замовлення ${order.orderNumber}`,

          comment:
            `UkrTradeHub — замовлення ${order.orderNumber}`,

          redirectUrl,

          webHookUrl,

          basketOrder,
        });

      /*
       * ===================================================
       * 17. SAVE INVOICE ID
       * ===================================================
       */

      const updatedPayment =
        await db.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            transactionId:
              invoice.invoiceId,

            status:
              PaymentStatus.PENDING,
          },
        });

      /*
       * ===================================================
       * 18. RESPONSE
       * ===================================================
       */

      return NextResponse.json({
        success: true,

        payment: {
          id: updatedPayment.id,
          status: updatedPayment.status,
          method: updatedPayment.method,
          amount: updatedPayment.amount,
          provider: updatedPayment.provider,
          transactionId:
            updatedPayment.transactionId,
        },

        redirect: true,

        paymentUrl:
          invoice.pageUrl,

        appUrl:
          invoice.appUrl ?? null,
      });
    } catch (error) {
      console.error(
        "[POST /api/payments] Monobank invoice error:",
        error,
      );

      /*
       * Invoice не створився.
       * Payment позначаємо FAILED.
       */

      try {
        await db.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status: PaymentStatus.FAILED,
          },
        });
      } catch (updateError) {
        console.error(
          "[POST /api/payments] Failed to mark payment as FAILED:",
          updateError,
        );
      }

      return jsonError(
        error instanceof Error
          ? error.message
          : "Не вдалося створити оплату Monobank",
        502,
        {
          paymentId: payment.id,
        },
      );
    }
  } catch (error) {
    console.error(
      "[POST /api/payments]",
      error,
    );

    return jsonError(
      "Не вдалося створити оплату",
      500,
    );
  }
}