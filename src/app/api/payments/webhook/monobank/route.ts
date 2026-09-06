import { NextRequest, NextResponse } from "next/server";
import {
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { db } from "@/lib/prisma";
import { finalizePaidOrder } from "@/lib/orders/finalize-paid-order";

import {
  isMonoUah,
  verifyMonoWebhookSignature,
} from "@/lib/payments/monobank";

export const runtime = "nodejs";

type MonoStatus =
  | "created"
  | "processing"
  | "hold"
  | "success"
  | "failure"
  | "reversed"
  | "expired";

type MonoWebhookPayload = {
  invoiceId?: unknown;
  status?: unknown;
  amount?: unknown;
  ccy?: unknown;
  reference?: unknown;
  modifiedDate?: unknown;
};

type WebhookResult = {
  status: string;
  paymentId: string;
  orderId: string;
  invoiceId: string;
  paymentStatus: PaymentStatus;
  orderStatus?: string | null;
  finalized?: boolean;
  alreadyPaid?: boolean;
};

function isMonoStatus(
  value: unknown
): value is MonoStatus {
  return (
    value === "created" ||
    value === "processing" ||
    value === "hold" ||
    value === "success" ||
    value === "failure" ||
    value === "reversed" ||
    value === "expired"
  );
}

function errorResponse(
  error: string,
  status: number
) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    { status }
  );
}

function successResponse(
  data: Record<string, unknown>
) {
  return NextResponse.json({
    ok: true,
    ...data,
  });
}

function parseString(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function parseInteger(
  value: unknown
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    return null;
  }

  return value;
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * 1. READ RAW BODY
     * =====================================================
     *
     * ВАЖЛИВО:
     * x-sign перевіряється саме по raw body.
     */

    const rawBody =
      await request.text();

    if (!rawBody) {
      return errorResponse(
        "EMPTY_WEBHOOK_BODY",
        400
      );
    }

    /*
     * =====================================================
     * 2. READ X-SIGN
     * =====================================================
     */

    const signature =
      request.headers
        .get("x-sign")
        ?.trim() ?? "";

    if (!signature) {
      console.error(
        "[MONOBANK WEBHOOK] Missing x-sign"
      );

      return errorResponse(
        "MISSING_X_SIGN",
        401
      );
    }

    /*
     * =====================================================
     * 3. VERIFY SIGNATURE
     * =====================================================
     */

    let validSignature = false;

    try {
      validSignature =
        await verifyMonoWebhookSignature(
          Buffer.from(
            rawBody,
            "utf8"
          ),
          signature
        );
    } catch (error) {
      console.error(
        "[MONOBANK WEBHOOK] Signature verification error:",
        error
      );

      return errorResponse(
        "SIGNATURE_VERIFICATION_FAILED",
        401
      );
    }

    if (!validSignature) {
      console.error(
        "[MONOBANK WEBHOOK] Invalid x-sign"
      );

      return errorResponse(
        "INVALID_SIGNATURE",
        401
      );
    }

    /*
     * =====================================================
     * 4. PARSE JSON
     * =====================================================
     */

    let payload: MonoWebhookPayload;

    try {
      payload = JSON.parse(
        rawBody
      ) as MonoWebhookPayload;
    } catch (error) {
      console.error(
        "[MONOBANK WEBHOOK] Invalid JSON:",
        error
      );

      return errorResponse(
        "INVALID_JSON",
        400
      );
    }

    /*
     * =====================================================
     * 5. EXTRACT DATA
     * =====================================================
     */

    const invoiceId =
      parseString(
        payload.invoiceId
      );

    const reference =
      parseString(
        payload.reference
      );

    const statusValue =
      parseString(
        payload.status
      );

    const amount =
      parseInteger(
        payload.amount
      );

    const currency =
      parseInteger(
        payload.ccy
      );

    const modifiedDate =
      parseString(
        payload.modifiedDate
      );

    /*
     * =====================================================
     * 6. VALIDATE BASIC DATA
     * =====================================================
     */

    if (!invoiceId) {
      return errorResponse(
        "MISSING_INVOICE_ID",
        400
      );
    }

    if (!reference) {
      return errorResponse(
        "MISSING_REFERENCE",
        400
      );
    }

    if (!isMonoStatus(statusValue)) {
      return errorResponse(
        "INVALID_MONO_STATUS",
        400
      );
    }

    const status: MonoStatus =
      statusValue;

    if (
      amount === null ||
      amount <= 0
    ) {
      return errorResponse(
        "INVALID_AMOUNT",
        400
      );
    }

    if (
      currency === null ||
      !isMonoUah(currency)
    ) {
      return errorResponse(
        "UNSUPPORTED_CURRENCY",
        400
      );
    }

    /*
     * =====================================================
     * 7. LOG WEBHOOK
     * =====================================================
     */

    console.log(
      "[MONOBANK WEBHOOK] Received",
      {
        invoiceId,
        reference,
        status,
        amount,
        currency,
        modifiedDate:
          modifiedDate || null,
      }
    );

    /*
     * =====================================================
     * 8. FIND PAYMENT
     * =====================================================
     *
     * У нашій системі:
     *
     * Monobank reference === Payment.id
     */

    const payment =
      await db.payment.findUnique({
        where: {
          id: reference,
        },

        include: {
          order: true,
        },
      });

    if (!payment) {
      /*
       * Важливо повернути 200.
       *
       * Інакше Monobank буде повторювати
       * webhook через відсутність HTTP 200.
       */

      console.warn(
        "[MONOBANK WEBHOOK] Payment not found",
        {
          paymentId: reference,
          invoiceId,
          status,
        }
      );

      return successResponse({
        status:
          "PAYMENT_NOT_FOUND",

        invoiceId,
      });
    }

    /*
     * =====================================================
     * 9. CHECK INVOICE ID
     * =====================================================
     *
     * При створенні invoice ми записуємо:
     *
     * Payment.transactionId = Monobank.invoiceId
     */

    if (
      payment.transactionId &&
      payment.transactionId !==
        invoiceId
    ) {
      console.error(
        "[MONOBANK WEBHOOK] Invoice mismatch",
        {
          paymentId:
            payment.id,

          expectedInvoice:
            payment.transactionId,

          receivedInvoice:
            invoiceId,
        }
      );

      return errorResponse(
        "INVOICE_MISMATCH",
        400
      );
    }

    /*
     * Якщо transactionId ще порожній,
     * це допускаємо.
     *
     * Далі success / processing / failure
     * запише invoiceId.
     */

    /*
     * =====================================================
     * 10. CHECK AMOUNT
     * =====================================================
     *
     * Monobank:
     *
     * 95000 = 950.00 UAH
     */

    const webhookAmount =
      new Prisma.Decimal(
        amount
      ).div(100);

    if (
      !webhookAmount.equals(
        payment.amount
      )
    ) {
      console.error(
        "[MONOBANK WEBHOOK] Amount mismatch",
        {
          paymentId:
            payment.id,

          orderId:
            payment.orderId,

          expected:
            payment.amount.toString(),

          received:
            webhookAmount.toString(),

          invoiceId,
        }
      );

      return errorResponse(
        "AMOUNT_MISMATCH",
        400
      );
    }

    /*
     * =====================================================
     * 11. SUCCESS
     * =====================================================
     */

    if (
      status === "success"
    ) {
      try {
        const result =
          await db.$transaction(
            async (tx) => {
              /*
               * Reload Payment INSIDE transaction.
               */

              const currentPayment =
                await tx.payment.findUnique({
                  where: {
                    id: payment.id,
                  },
                });

              if (!currentPayment) {
                throw new Error(
                  "PAYMENT_NOT_FOUND"
                );
              }

              /*
               * =================================================
               * ALREADY PAID
               * =================================================
               *
               * Це головний захист від повторного webhook.
               */

              if (
                currentPayment.status ===
                PaymentStatus.PAID
              ) {
                return {
                  alreadyPaid: true,
                  finalized: false,

                  paymentStatus:
                    PaymentStatus.PAID,

                  orderStatus:
                    null,
                };
              }

              /*
               * =================================================
               * REFUNDED PAYMENT
               * =================================================
               *
               * Не дозволяємо воскресити payment.
               */

              if (
                currentPayment.status ===
                  PaymentStatus.REFUNDED ||
                currentPayment.status ===
                  PaymentStatus.PARTIALLY_REFUNDED
              ) {
                console.warn(
                  "[MONOBANK WEBHOOK] Success ignored for refunded payment",
                  {
                    paymentId:
                      currentPayment.id,

                    orderId:
                      currentPayment.orderId,

                    invoiceId,
                  }
                );

                return {
                  alreadyPaid: false,
                  finalized: false,

                  paymentStatus:
                    currentPayment.status,

                  orderStatus:
                    null,
                };
              }

              /*
               * =================================================
               * PAYMENT -> PAID
               * =================================================
               */

              await tx.payment.update({
                where: {
                  id:
                    currentPayment.id,
                },

                data: {
                  status:
                    PaymentStatus.PAID,

                  paidAt:
                    currentPayment.paidAt ??
                    new Date(),

                  transactionId:
                    invoiceId,
                },
              });

              /*
               * =================================================
               * FINALIZE ORDER
               * =================================================
               *
               * ВАЖЛИВО:
               * той самий tx.
               */

              const finalized =
                await finalizePaidOrder(
                  currentPayment.orderId,
                  tx
                );

              return {
                alreadyPaid: false,

                finalized:
                  finalized.finalized,

                paymentStatus:
                  PaymentStatus.PAID,

                orderStatus:
                  finalized.status,
              };
            },
            {
              isolationLevel:
                Prisma.TransactionIsolationLevel.Serializable,

              maxWait: 5000,

              timeout: 15000,
            }
          );

        console.log(
          "[MONOBANK WEBHOOK] SUCCESS processed",
          {
            paymentId:
              payment.id,

            orderId:
              payment.orderId,

            invoiceId,

            alreadyPaid:
              result.alreadyPaid,

            finalized:
              result.finalized,

            orderStatus:
              result.orderStatus,
          }
        );

        return successResponse({
          status:
            "PAYMENT_PAID",

          paymentId:
            payment.id,

          orderId:
            payment.orderId,

          invoiceId,

          paymentStatus:
            result.paymentStatus,

          orderStatus:
            result.orderStatus,

          finalized:
            result.finalized,

          alreadyPaid:
            result.alreadyPaid,
        });
      } catch (error) {
        console.error(
          "[MONOBANK WEBHOOK] SUCCESS finalization error:",
          error
        );

        /*
         * 500 = Monobank може повторити webhook.
         *
         * Це потрібно, якщо транзакція впала.
         */

        return errorResponse(
          "PAYMENT_FINALIZATION_FAILED",
          500
        );
      }
    }

    /*
     * =====================================================
     * 12. PROCESSING / HOLD
     * =====================================================
     */

    if (
      status === "processing" ||
      status === "hold"
    ) {
      /*
       * Не переводимо PAID назад у PROCESSING.
       *
       * Не переводимо REFUNDED назад.
       *
       * Не переводимо FAILED назад.
       */

      const result =
        await db.payment.updateMany({
          where: {
            id:
              payment.id,

            status:
              PaymentStatus.PENDING,
          },

          data: {
            status:
              PaymentStatus.PROCESSING,

            transactionId:
              invoiceId,
          },
        });

      if (result.count === 0) {
        const current =
          await db.payment.findUnique({
            where: {
              id: payment.id,
            },
            select: {
              status: true,
            },
          });

        console.log(
          "[MONOBANK WEBHOOK] Processing ignored",
          {
            paymentId:
              payment.id,

            invoiceId,

            currentStatus:
              current?.status ??
              payment.status,
          }
        );

        return successResponse({
          status:
            "PROCESSING_IGNORED",

          paymentId:
            payment.id,

          orderId:
            payment.orderId,

          invoiceId,

          paymentStatus:
            current?.status ??
            payment.status,
        });
      }

      return successResponse({
        status:
          "PAYMENT_PROCESSING",

        paymentId:
          payment.id,

        orderId:
          payment.orderId,

        invoiceId,

        paymentStatus:
          PaymentStatus.PROCESSING,
      });
    }

    /*
     * =====================================================
     * 13. FAILURE
     * =====================================================
     */

    if (
      status === "failure"
    ) {
      /*
       * FAILED може змінити тільки:
       *
       * PENDING
       * PROCESSING
       *
       * PAID не можна перевести назад у FAILED.
       */

      const result =
        await db.payment.updateMany({
          where: {
            id:
              payment.id,

            status: {
              in: [
                PaymentStatus.PENDING,
                PaymentStatus.PROCESSING,
              ],
            },
          },

          data: {
            status:
              PaymentStatus.FAILED,

            transactionId:
              invoiceId,
          },
        });

      if (result.count === 0) {
        const current =
          await db.payment.findUnique({
            where: {
              id: payment.id,
            },

            select: {
              status: true,
            },
          });

        console.log(
          "[MONOBANK WEBHOOK] Failure ignored",
          {
            paymentId:
              payment.id,

            invoiceId,

            currentStatus:
              current?.status ??
              payment.status,
          }
        );

        return successResponse({
          status:
            "FAILURE_IGNORED",

          paymentId:
            payment.id,

          orderId:
            payment.orderId,

          invoiceId,

          paymentStatus:
            current?.status ??
            payment.status,
        });
      }

      return successResponse({
        status:
          "PAYMENT_FAILED",

        paymentId:
          payment.id,

        orderId:
          payment.orderId,

        invoiceId,

        paymentStatus:
          PaymentStatus.FAILED,
      });
    }

    /*
     * =====================================================
     * 14. REVERSED
     * =====================================================
     *
     * Monobank повідомив, що успішна операція
     * була reversed.
     *
     * Тут НЕ чіпаємо stock / Order / payout.
     *
     * Це окремий refund/reversal workflow.
     */

    if (
      status === "reversed"
    ) {
      const result =
        await db.payment.updateMany({
          where: {
            id:
              payment.id,

            status:
              PaymentStatus.PAID,
          },

          data: {
            status:
              PaymentStatus.REFUNDED,

            transactionId:
              invoiceId,
          },
        });

      if (result.count === 0) {
        const current =
          await db.payment.findUnique({
            where: {
              id: payment.id,
            },

            select: {
              status: true,
            },
          });

        return successResponse({
          status:
            "REVERSED_IGNORED",

          paymentId:
            payment.id,

          orderId:
            payment.orderId,

          invoiceId,

          paymentStatus:
            current?.status ??
            payment.status,
        });
      }

      console.warn(
        "[MONOBANK WEBHOOK] Payment reversed",
        {
          paymentId:
            payment.id,

          orderId:
            payment.orderId,

          invoiceId,
        }
      );

      return successResponse({
        status:
          "PAYMENT_REFUNDED",

        paymentId:
          payment.id,

        orderId:
          payment.orderId,

        invoiceId,

        paymentStatus:
          PaymentStatus.REFUNDED,
      });
    }

    /*
     * =====================================================
     * 15. CREATED
     * =====================================================
     *
     * CREATED не змінює статус Payment.
     *
     * Payment залишається PENDING.
     */

    if (
      status === "created"
    ) {
      /*
       * Якщо transactionId ще порожній,
       * записуємо invoiceId.
       *
       * Якщо вже є інший invoiceId,
       * ми б зупинилися раніше на
       * INVOICE_MISMATCH.
       */

      if (!payment.transactionId) {
        await db.payment.updateMany({
          where: {
            id:
              payment.id,

            status:
              PaymentStatus.PENDING,

            transactionId:
              null,
          },

          data: {
            transactionId:
              invoiceId,
          },
        });
      }

      return successResponse({
        status:
          "PAYMENT_CREATED",

        paymentId:
          payment.id,

        orderId:
          payment.orderId,

        invoiceId,

        paymentStatus:
          payment.status,
      });
    }

    /*
     * =====================================================
     * 16. EXPIRED
     * =====================================================
     *
     * Monobank docs зазначають, що webhook
     * для expired може не надсилатися.
     *
     * Але якщо він прийде — обробимо без
     * руйнування інших станів.
     */

    if (
      status === "expired"
    ) {
      const result =
        await db.payment.updateMany({
          where: {
            id:
              payment.id,

            status: {
              in: [
                PaymentStatus.PENDING,
                PaymentStatus.PROCESSING,
              ],
            },
          },

          data: {
            status:
              PaymentStatus.CANCELLED,

            transactionId:
              invoiceId,
          },
        });

      if (result.count === 0) {
        const current =
          await db.payment.findUnique({
            where: {
              id: payment.id,
            },

            select: {
              status: true,
            },
          });

        return successResponse({
          status:
            "EXPIRED_IGNORED",

          paymentId:
            payment.id,

          orderId:
            payment.orderId,

          invoiceId,

          paymentStatus:
            current?.status ??
            payment.status,
        });
      }

      return successResponse({
        status:
          "PAYMENT_EXPIRED",

        paymentId:
          payment.id,

        orderId:
          payment.orderId,

        invoiceId,

        paymentStatus:
          PaymentStatus.CANCELLED,
      });
    }

    /*
     * =====================================================
     * 17. FALLBACK
     * =====================================================
     */

    return successResponse({
      status:
        "WEBHOOK_IGNORED",

      paymentId:
        payment.id,

      orderId:
        payment.orderId,

      invoiceId,

      paymentStatus:
        payment.status,
    });
  } catch (error) {
    console.error(
      "[MONOBANK WEBHOOK] Unexpected error:",
      error
    );

    return errorResponse(
      "WEBHOOK_INTERNAL_ERROR",
      500
    );
  }
}