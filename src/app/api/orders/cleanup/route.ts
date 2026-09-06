import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export const runtime = "nodejs";

const ORDER_TIMEOUT_MINUTES = 70;
const MAX_ORDERS_PER_RUN = 100;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("[ORDER_CLEANUP] CRON_SECRET is not configured");
    return false;
  }

  const authorization = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");

  if (authorization === `Bearer ${secret}`) {
    return true;
  }

  if (cronSecret === secret) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const startedAt = Date.now();

  try {
    const now = new Date();

    const cutoffDate = new Date(
      now.getTime() -
        ORDER_TIMEOUT_MINUTES * 60 * 1000
    );

    /*
     * Беремо тільки старі PENDING замовлення.
     *
     * CONFIRMED, COMPLETED, CANCELLED тощо сюди
     * ніколи не потрапляють.
     */
    const orders = await db.order.findMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: MAX_ORDERS_PER_RUN,
    });

    let cancelled = 0;
    let skipped = 0;
    let errors = 0;

    const results: Array<{
      orderId: string;
      orderNumber: string;
      status:
        | "cancelled"
        | "skipped"
        | "error";
      reason?: string;
    }> = [];

    for (const candidate of orders) {
      try {
        const result = await db.$transaction(
          async (tx) => {
            /*
             * Повторно читаємо замовлення всередині
             * transaction.
             *
             * Це важливо для захисту від ситуації:
             *
             * cleanup стартував
             * ↓
             * покупець оплатив
             * ↓
             * webhook підтвердив order
             *
             * Поки cleanup обробляв запис.
             */
            const order = await tx.order.findUnique({
              where: {
                id: candidate.id,
              },
              include: {
                items: true,
                payments: {
                  select: {
                    id: true,
                    method: true,
                    status: true,
                    provider: true,
                    transactionId: true,
                  },
                },
              },
            });

            if (!order) {
              return {
                status: "skipped" as const,
                reason: "ORDER_NOT_FOUND",
              };
            }

            /*
             * Замовлення вже змінилося.
             */
            if (order.status !== "PENDING") {
              return {
                status: "skipped" as const,
                reason: "ORDER_ALREADY_PROCESSED",
              };
            }

            /*
             * Якщо є хоча б один PAID payment —
             * замовлення не можна скасовувати.
             */
            const hasPaidPayment = order.payments.some(
              (payment) => payment.status === "PAID"
            );

            if (hasPaidPayment) {
              return {
                status: "skipped" as const,
                reason: "PAYMENT_ALREADY_PAID",
              };
            }

            /*
             * CASH_ON_DELIVERY та BANK_TRANSFER —
             * це не онлайн-оплата.
             *
             * Не скасовуємо такі замовлення автоматично
             * через 70 хвилин.
             */
            const hasLocalPaymentWaiting =
              order.payments.some(
                (payment) =>
                  (
                    payment.method ===
                      "CASH_ON_DELIVERY" ||
                    payment.method ===
                      "BANK_TRANSFER"
                  ) &&
                  (
                    payment.status === "PENDING" ||
                    payment.status === "PROCESSING"
                  )
              );

            if (hasLocalPaymentWaiting) {
              return {
                status: "skipped" as const,
                reason: "LOCAL_PAYMENT_PENDING",
              };
            }

            /*
             * На цьому етапі маємо:
             *
             * - PENDING order
             * - немає PAID payment
             * - немає активного COD/BANK_TRANSFER
             *
             * Отже замовлення можна автоматично
             * закрити.
             */

            /*
             * Спочатку атомарно переводимо Order
             * PENDING -> CANCELLED.
             *
             * Якщо webhook встигне підтвердити замовлення,
             * count буде 0 і ми нічого не чіпатимемо.
             */
            const cancelledOrder =
              await tx.order.updateMany({
                where: {
                  id: order.id,
                  status: "PENDING",
                },
                data: {
                  status: "CANCELLED",
                },
              });

            if (cancelledOrder.count !== 1) {
              return {
                status: "skipped" as const,
                reason: "ORDER_CHANGED_CONCURRENTLY",
              };
            }

            /*
             * Скасовуємо активні Monobank payments.
             *
             * FAILED залишаємо FAILED —
             * він уже є фінальним результатом конкретної
             * спроби платежу.
             */
            await tx.payment.updateMany({
              where: {
                orderId: order.id,
                provider: "MONOBANK",
                status: {
                  in: ["PENDING", "PROCESSING"],
                },
              },
              data: {
                status: "CANCELLED",
              },
            });

            /*
             * Тепер звільняємо зарезервований товар.
             *
             * ВАЖЛИВО:
             * stock НЕ збільшуємо.
             *
             * Під час створення order ми тільки збільшили
             * reservedStock.
             *
             * Тому при скасуванні:
             *
             * reservedStock -= quantity
             *
             * stock залишається без змін.
             */
            for (const item of order.items) {
              if (item.quantity <= 0) {
                throw new Error(
                  `INVALID_ITEM_QUANTITY:${item.id}`
                );
              }

              if (item.variantId) {
                const released =
                  await tx.productVariant.updateMany({
                    where: {
                      id: item.variantId,
                      reservedStock: {
                        gte: item.quantity,
                      },
                    },
                    data: {
                      reservedStock: {
                        decrement: item.quantity,
                      },
                    },
                  });

                if (released.count !== 1) {
                  throw new Error(
                    `VARIANT_RESERVED_STOCK_RELEASE_FAILED:${item.variantId}`
                  );
                }
              } else {
                const released =
                  await tx.product.updateMany({
                    where: {
                      id: item.productId,
                      reservedStock: {
                        gte: item.quantity,
                      },
                    },
                    data: {
                      reservedStock: {
                        decrement: item.quantity,
                      },
                    },
                  });

                if (released.count !== 1) {
                  throw new Error(
                    `PRODUCT_RESERVED_STOCK_RELEASE_FAILED:${item.productId}`
                  );
                }
              }
            }

            /*
             * Скасовані seller-частини замовлення.
             */
            await tx.orderSeller.updateMany({
              where: {
                orderId: order.id,
                status: "PENDING",
              },
              data: {
                status: "CANCELLED",
              },
            });

            return {
              status: "cancelled" as const,
              reason: "ORDER_TIMEOUT",
            };
          }
        );

        if (result.status === "cancelled") {
          cancelled++;
        } else {
          skipped++;
        }

        results.push({
          orderId: candidate.id,
          orderNumber: candidate.orderNumber,
          status: result.status,
          reason: result.reason,
        });
      } catch (error) {
        errors++;

        console.error(
          "[ORDER_CLEANUP_ORDER_ERROR]",
          {
            orderId: candidate.id,
            orderNumber: candidate.orderNumber,
            error,
          }
        );

        results.push({
          orderId: candidate.id,
          orderNumber: candidate.orderNumber,
          status: "error",
          reason:
            error instanceof Error
              ? error.message
              : "UNKNOWN_ERROR",
        });
      }
    }

    const durationMs = Date.now() - startedAt;

    console.log(
      "[ORDER_CLEANUP]",
      {
        checked: orders.length,
        cancelled,
        skipped,
        errors,
        timeoutMinutes: ORDER_TIMEOUT_MINUTES,
        durationMs,
      }
    );

    return NextResponse.json({
      ok: true,

      checked: orders.length,
      cancelled,
      skipped,
      errors,

      timeoutMinutes: ORDER_TIMEOUT_MINUTES,
      cutoffDate: cutoffDate.toISOString(),

      durationMs,

      results,
    });
  } catch (error) {
    console.error(
      "[ORDER_CLEANUP_FATAL_ERROR]",
      error
    );

    return NextResponse.json(
      {
        error: "Order cleanup failed",
      },
      {
        status: 500,
      }
    );
  }
}