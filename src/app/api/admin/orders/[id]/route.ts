import { NextRequest, NextResponse } from "next/server";
import { OrderStatus , Prisma } from "@prisma/client";

import { db } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { finalizePaidOrder } from "@/lib/orders/finalize-paid-order";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const orderInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      isBlocked: true,
    },
  },

  shippingAddress: true,

  items: {
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          sku: true,
          price: true,
          stock: true,
          reservedStock: true,
          status: true,
        },
      },

      variant: {
        select: {
          id: true,
          title: true,
          sku: true,
          price: true,
          stock: true,
          reservedStock: true,
          isActive: true,
        },
      },

      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          sellerStatus: true,
          isActive: true,
        },
      },
    },
  },

  sellers: {
    include: {
      shop: true,
    },
  },

  payments: {
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      provider: true,
      transactionId: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },

  delivery: true,
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ORDER_ID_REQUIRED" },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: {
        id,
      },
      include: orderInclude,
    });

    if (!order) {
      return NextResponse.json(
        { error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error(
      "GET /api/admin/orders/[id] error:",
      error
    );

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ORDER_ID_REQUIRED" },
        { status: 400 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "INVALID_JSON" },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("status" in body)
    ) {
      return NextResponse.json(
        { error: "STATUS_REQUIRED" },
        { status: 400 }
      );
    }

    const requestedStatus = (
      body as { status?: unknown }
    ).status;

    const validStatuses = Object.values(OrderStatus);

    if (
      typeof requestedStatus !== "string" ||
      !validStatuses.includes(
        requestedStatus as OrderStatus
      )
    ) {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          allowedStatuses: validStatuses,
        },
        { status: 400 }
      );
    }

    const targetStatus =
      requestedStatus as OrderStatus;

    const updatedOrder = await db.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: {
            id,
          },

          include: {
            items: {
              select: {
                id: true,
                productId: true,
                variantId: true,
                shopId: true,
                quantity: true,
              },
            },

            sellers: {
              select: {
                id: true,
                status: true,
              },
            },

            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                method: true,
                provider: true,
                transactionId: true,
                paidAt: true,
              },
            },
          },
        });

        if (!order) {
          throw new Error("ORDER_NOT_FOUND");
        }

        const currentStatus = order.status;

        /*
         * =====================================================
         * NO-OP
         * =====================================================
         */

        if (currentStatus === targetStatus) {
          return tx.order.findUniqueOrThrow({
            where: {
              id,
            },
            include: orderInclude,
          });
        }

        /*
         * =====================================================
         * IMMUTABLE
         * =====================================================
         */

        if (
          currentStatus === OrderStatus.CANCELLED
        ) {
          throw new Error(
            "CANCELLED_ORDER_IMMUTABLE"
          );
        }

        if (
          currentStatus === OrderStatus.REFUNDED
        ) {
          throw new Error(
            "REFUNDED_ORDER_IMMUTABLE"
          );
        }

        /*
         * =====================================================
         * PENDING -> CONFIRMED
         * =====================================================
         *
         * finalizePaidOrder:
         *
         * - stock -= quantity
         * - reservedStock -= quantity
         * - Product.salesCount += quantity
         * - Shop.salesCount += quantity
         * - OrderSeller -> CONFIRMED
         * - SellerPayout -> PENDING
         * - Order -> CONFIRMED
         *
         * ВАЖЛИВО:
         * finalizePaidOrder вимагає PAID payment.
         */

        if (
          currentStatus === OrderStatus.PENDING &&
          targetStatus === OrderStatus.CONFIRMED
        ) {
          const finalized =
            await finalizePaidOrder(
              order.id,
              tx
            );

          /*
           * finalized повертаємо тільки для того,
           * щоб TypeScript не вважав виклик невикористаним.
           */
          void finalized;

          return tx.order.findUniqueOrThrow({
            where: {
              id: order.id,
            },
            include: orderInclude,
          });
        }

        /*
         * =====================================================
         * PENDING -> CANCELLED
         * =====================================================
         */

        if (
          currentStatus === OrderStatus.PENDING &&
          targetStatus === OrderStatus.CANCELLED
        ) {
          const hasPaidPayment =
            order.payments.some(
              (payment) =>
                payment.status ===
                "PAID"
            );

          if (hasPaidPayment) {
            throw new Error(
              "PAID_ORDER_REQUIRES_REFUND"
            );
          }

          /*
           * Скасовуємо активні платежі.
           */

          await tx.payment.updateMany({
            where: {
              orderId: order.id,
              status: {
                in: [
                  "PENDING",
                  "PROCESSING",
                ],
              },
            },

            data: {
              status: "CANCELLED",
            },
          });

          /*
           * Звільняємо reservedStock.
           */

          for (const item of order.items) {
            if (item.quantity <= 0) {
              throw new Error(
                `INVALID_ORDER_ITEM_QUANTITY:${item.id}`
              );
            }

            if (item.variantId) {
              const result =
                await tx.productVariant.updateMany(
                  {
                    where: {
                      id: item.variantId,
                      reservedStock: {
                        gte: item.quantity,
                      },
                    },

                    data: {
                      reservedStock: {
                        decrement:
                          item.quantity,
                      },
                    },
                  }
                );

              if (result.count !== 1) {
                throw new Error(
                  `RESERVED_STOCK_RELEASE_FAILED:${item.id}`
                );
              }
            } else {
              const result =
                await tx.product.updateMany({
                  where: {
                    id: item.productId,
                    reservedStock: {
                      gte: item.quantity,
                    },
                  },

                  data: {
                    reservedStock: {
                      decrement:
                        item.quantity,
                    },
                  },
                });

              if (result.count !== 1) {
                throw new Error(
                  `RESERVED_STOCK_RELEASE_FAILED:${item.id}`
                );
              }
            }
          }

          /*
           * OrderSeller -> CANCELLED
           */

          await tx.orderSeller.updateMany({
            where: {
              orderId: order.id,
              status: OrderStatus.PENDING,
            },

            data: {
              status:
                OrderStatus.CANCELLED,
            },
          });

          /*
           * Order -> CANCELLED
           */

          const result =
            await tx.order.updateMany({
              where: {
                id: order.id,
                status:
                  OrderStatus.PENDING,
              },

              data: {
                status:
                  OrderStatus.CANCELLED,
              },
            });

          if (result.count !== 1) {
            throw new Error(
              "ORDER_STATUS_UPDATE_FAILED"
            );
          }

          return tx.order.findUniqueOrThrow({
            where: {
              id: order.id,
            },
            include: orderInclude,
          });
        }

        /*
         * =====================================================
         * CONFIRMED -> PROCESSING
         * =====================================================
         */

        if (
          currentStatus ===
            OrderStatus.CONFIRMED &&
          targetStatus ===
            OrderStatus.PROCESSING
        ) {
          const result =
            await tx.order.updateMany({
              where: {
                id: order.id,
                status:
                  OrderStatus.CONFIRMED,
              },

              data: {
                status:
                  OrderStatus.PROCESSING,
              },
            });

          if (result.count !== 1) {
            throw new Error(
              "ORDER_STATUS_UPDATE_FAILED"
            );
          }

          await tx.orderSeller.updateMany({
            where: {
              orderId: order.id,
              status:
                OrderStatus.CONFIRMED,
            },

            data: {
              status:
                OrderStatus.PROCESSING,
            },
          });

          return tx.order.findUniqueOrThrow({
            where: {
              id: order.id,
            },
            include: orderInclude,
          });
        }

        /*
         * =====================================================
         * PROCESSING -> SHIPPED
         * =====================================================
         */

        if (
          currentStatus ===
            OrderStatus.PROCESSING &&
          targetStatus ===
            OrderStatus.SHIPPED
        ) {
          const result =
            await tx.order.updateMany({
              where: {
                id: order.id,
                status:
                  OrderStatus.PROCESSING,
              },

              data: {
                status:
                  OrderStatus.SHIPPED,
              },
            });

          if (result.count !== 1) {
            throw new Error(
              "ORDER_STATUS_UPDATE_FAILED"
            );
          }

          await tx.orderSeller.updateMany({
            where: {
              orderId: order.id,
              status:
                OrderStatus.PROCESSING,
            },

            data: {
              status:
                OrderStatus.SHIPPED,
            },
          });

          return tx.order.findUniqueOrThrow({
            where: {
              id: order.id,
            },
            include: orderInclude,
          });
        }

        /*
         * =====================================================
         * SHIPPED -> DELIVERED
         * =====================================================
         */

        if (
          currentStatus ===
            OrderStatus.SHIPPED &&
          targetStatus ===
            OrderStatus.DELIVERED
        ) {
          const result =
            await tx.order.updateMany({
              where: {
                id: order.id,
                status:
                  OrderStatus.SHIPPED,
              },

              data: {
                status:
                  OrderStatus.DELIVERED,
              },
            });

          if (result.count !== 1) {
            throw new Error(
              "ORDER_STATUS_UPDATE_FAILED"
            );
          }

          await tx.orderSeller.updateMany({
            where: {
              orderId: order.id,
              status:
                OrderStatus.SHIPPED,
            },

            data: {
              status:
                OrderStatus.DELIVERED,
            },
          });

          return tx.order.findUniqueOrThrow({
            where: {
              id: order.id,
            },
            include: orderInclude,
          });
        }

        /*
         * =====================================================
         * DELIVERED -> COMPLETED
         * =====================================================
         */

        if (
          currentStatus ===
            OrderStatus.DELIVERED &&
          targetStatus ===
            OrderStatus.COMPLETED
        ) {
          const result =
            await tx.order.updateMany({
              where: {
                id: order.id,
                status:
                  OrderStatus.DELIVERED,
              },

              data: {
                status:
                  OrderStatus.COMPLETED,
              },
            });

          if (result.count !== 1) {
            throw new Error(
              "ORDER_STATUS_UPDATE_FAILED"
            );
          }

          await tx.orderSeller.updateMany({
            where: {
              orderId: order.id,
              status:
                OrderStatus.DELIVERED,
            },

            data: {
              status:
                OrderStatus.COMPLETED,
            },
          });

          return tx.order.findUniqueOrThrow({
            where: {
              id: order.id,
            },
            include: orderInclude,
          });
        }

        /*
         * =====================================================
         * DELIVERED / COMPLETED -> RETURNED
         * =====================================================
         */

        if (
          targetStatus ===
          OrderStatus.RETURNED
        ) {
          if (
            currentStatus !==
              OrderStatus.DELIVERED &&
            currentStatus !==
              OrderStatus.COMPLETED
          ) {
            throw new Error(
              "INVALID_RETURN_TRANSITION"
            );
          }

          await tx.order.update({
            where: {
              id: order.id,
            },

            data: {
              status:
                OrderStatus.RETURNED,
            },
          });

          await tx.orderSeller.updateMany({
            where: {
              orderId: order.id,
              status: {
                in: [
                  OrderStatus.DELIVERED,
                  OrderStatus.COMPLETED,
                ],
              },
            },

            data: {
              status:
                OrderStatus.RETURNED,
            },
          });

          return tx.order.findUniqueOrThrow({
            where: {
              id: order.id,
            },
            include: orderInclude,
          });
        }

        /*
         * =====================================================
         * RETURNED -> REFUNDED
         * =====================================================
         */

        if (
          targetStatus ===
          OrderStatus.REFUNDED
        ) {
          if (
            currentStatus !==
            OrderStatus.RETURNED
          ) {
            throw new Error(
              "REFUND_REQUIRES_RETURNED_ORDER"
            );
          }

          await tx.order.update({
            where: {
              id: order.id,
            },

            data: {
              status:
                OrderStatus.REFUNDED,
            },
          });

          await tx.orderSeller.updateMany({
            where: {
              orderId: order.id,
              status:
                OrderStatus.RETURNED,
            },

            data: {
              status:
                OrderStatus.REFUNDED,
            },
          });

          return tx.order.findUniqueOrThrow({
            where: {
              id: order.id,
            },
            include: orderInclude,
          });
        }

        /*
         * =====================================================
         * CONFIRMED -> CANCELLED
         * =====================================================
         */

        if (
          currentStatus ===
            OrderStatus.CONFIRMED &&
          targetStatus ===
            OrderStatus.CANCELLED
        ) {
          throw new Error(
            "CONFIRMED_ORDER_REQUIRES_REFUND"
          );
        }

        /*
         * =====================================================
         * INVALID TRANSITION
         * =====================================================
         */

        throw new Error(
          `INVALID_ORDER_STATUS_TRANSITION:${currentStatus}->${targetStatus}`
        );
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,

        maxWait: 5000,

        timeout: 15000,
      }
    );

    return NextResponse.json(
      updatedOrder
    );
  } catch (error) {
    console.error(
      "PATCH /api/admin/orders/[id] error:",
      error
    );

    if (error instanceof Error) {
      switch (error.message) {
        case "ORDER_NOT_FOUND":
          return NextResponse.json(
            {
              error:
                "ORDER_NOT_FOUND",
            },
            { status: 404 }
          );

        case "CANCELLED_ORDER_IMMUTABLE":
          return NextResponse.json(
            {
              error:
                "CANCELLED_ORDER_IMMUTABLE",
              message:
                "Скасоване замовлення не можна змінити.",
            },
            { status: 409 }
          );

        case "REFUNDED_ORDER_IMMUTABLE":
          return NextResponse.json(
            {
              error:
                "REFUNDED_ORDER_IMMUTABLE",
              message:
                "Повернене замовлення не можна змінити.",
            },
            { status: 409 }
          );

        case "PAYMENT_NOT_PAID":
          return NextResponse.json(
            {
              error:
                "PAYMENT_NOT_PAID",
              message:
                "Замовлення не можна підтвердити, доки платіж не має статус PAID.",
            },
            { status: 409 }
          );

        case "PAID_ORDER_REQUIRES_REFUND":
          return NextResponse.json(
            {
              error:
                "PAID_ORDER_REQUIRES_REFUND",
              message:
                "Замовлення вже оплачено. Спочатку потрібно виконати повернення коштів.",
            },
            { status: 409 }
          );

        case "CONFIRMED_ORDER_REQUIRES_REFUND":
          return NextResponse.json(
            {
              error:
                "CONFIRMED_ORDER_REQUIRES_REFUND",
              message:
                "Підтверджене замовлення не можна просто скасувати. Потрібен процес повернення.",
            },
            { status: 409 }
          );

        case "INVALID_RETURN_TRANSITION":
          return NextResponse.json(
            {
              error:
                "INVALID_RETURN_TRANSITION",
              message:
                "Повернення можливе лише для DELIVERED або COMPLETED.",
            },
            { status: 409 }
          );

        case "REFUND_REQUIRES_RETURNED_ORDER":
          return NextResponse.json(
            {
              error:
                "REFUND_REQUIRES_RETURNED_ORDER",
              message:
                "Для REFUNDED замовлення спочатку повинно мати статус RETURNED.",
            },
            { status: 409 }
          );

        case "ORDER_STATUS_UPDATE_FAILED":
          return NextResponse.json(
            {
              error:
                "ORDER_STATUS_UPDATE_FAILED",
              message:
                "Не вдалося змінити статус замовлення.",
            },
            { status: 409 }
          );
      }

      if (
        error.message.startsWith(
          "RESERVED_STOCK_RELEASE_FAILED:"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "RESERVED_STOCK_RELEASE_FAILED",
            message:
              "Не вдалося звільнити зарезервований товар.",
          },
          { status: 409 }
        );
      }

      if (
        error.message.startsWith(
          "INVALID_ORDER_ITEM_QUANTITY:"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "INVALID_ORDER_ITEM_QUANTITY",
            message:
              "Замовлення містить некоректну кількість товару.",
          },
          { status: 409 }
        );
      }

      if (
        error.message.startsWith(
          "INVALID_ORDER_STATUS_TRANSITION:"
        )
      ) {
        const transition =
          error.message.replace(
            "INVALID_ORDER_STATUS_TRANSITION:",
            ""
          );

        const [from, to] =
          transition.split("->");

        return NextResponse.json(
          {
            error:
              "INVALID_ORDER_STATUS_TRANSITION",
            message:
              "Такий перехід статусу замовлення заборонений.",
            from,
            to,
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}