import {
  OrderStatus,
  Prisma,
} from "@prisma/client";

import { db } from "@/lib/prisma";

type TxClient = Prisma.TransactionClient;

export type FinalizePaidOrderResult = {
  orderId: string;
  status: OrderStatus;
  finalized: boolean;
  alreadyFinalized: boolean;
};

async function finalizeWithTransaction(
  orderId: string,
  tx: TxClient
): Promise<FinalizePaidOrderResult> {
  const order = await tx.order.findUnique({
    where: {
      id: orderId,
    },

    include: {
      items: true,

      sellers: {
        include: {
          payout: true,
        },
      },

      payments: {
        where: {
          status: "PAID",
        },

        orderBy: {
          paidAt: "desc",
        },
      },
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  /*
   * Якщо замовлення вже було фіналізоване,
   * повторно списувати stock/salesCount не можна.
   */
  if (
    order.status === OrderStatus.CONFIRMED ||
    order.status === OrderStatus.PROCESSING ||
    order.status === OrderStatus.SHIPPED ||
    order.status === OrderStatus.DELIVERED ||
    order.status === OrderStatus.COMPLETED
  ) {
    return {
      orderId: order.id,
      status: order.status,
      finalized: false,
      alreadyFinalized: true,
    };
  }

  if (
    order.status === OrderStatus.CANCELLED ||
    order.status === OrderStatus.REFUNDED
  ) {
    throw new Error(
      `ORDER_CANNOT_BE_FINALIZED:${order.status}`
    );
  }

  const paidPayment = order.payments[0];

  if (!paidPayment) {
    throw new Error("PAYMENT_NOT_PAID");
  }

  const productSales = new Map<string, number>();
  const shopSales = new Map<string, number>();

  /*
   * ============================================================
   * STOCK
   * ============================================================
   */

  for (const item of order.items) {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error(
        `INVALID_ORDER_ITEM_QUANTITY:${item.id}`
      );
    }

    if (item.variantId) {
      const variant =
        await tx.productVariant.findUnique({
          where: {
            id: item.variantId,
          },
        });

      if (!variant) {
        throw new Error(
          `VARIANT_NOT_FOUND:${item.variantId}`
        );
      }

      if (
        variant.reservedStock <
        item.quantity
      ) {
        throw new Error(
          `VARIANT_RESERVED_STOCK_INVALID:${item.variantId}`
        );
      }

      if (
        variant.stock <
        item.quantity
      ) {
        throw new Error(
          `VARIANT_STOCK_INVALID:${item.variantId}`
        );
      }

      const updated =
        await tx.productVariant.updateMany({
          where: {
            id: item.variantId,

            stock: {
              gte: item.quantity,
            },

            reservedStock: {
              gte: item.quantity,
            },
          },

          data: {
            stock: {
              decrement: item.quantity,
            },

            reservedStock: {
              decrement: item.quantity,
            },
          },
        });

      if (updated.count !== 1) {
        throw new Error(
          `VARIANT_STOCK_CHANGED:${item.variantId}`
        );
      }
    } else {
      const product =
        await tx.product.findUnique({
          where: {
            id: item.productId,
          },
        });

      if (!product) {
        throw new Error(
          `PRODUCT_NOT_FOUND:${item.productId}`
        );
      }

      if (
        product.reservedStock <
        item.quantity
      ) {
        throw new Error(
          `PRODUCT_RESERVED_STOCK_INVALID:${item.productId}`
        );
      }

      if (
        product.stock <
        item.quantity
      ) {
        throw new Error(
          `PRODUCT_STOCK_INVALID:${item.productId}`
        );
      }

      const updated =
        await tx.product.updateMany({
          where: {
            id: item.productId,

            stock: {
              gte: item.quantity,
            },

            reservedStock: {
              gte: item.quantity,
            },
          },

          data: {
            stock: {
              decrement: item.quantity,
            },

            reservedStock: {
              decrement: item.quantity,
            },
          },
        });

      if (updated.count !== 1) {
        throw new Error(
          `PRODUCT_STOCK_CHANGED:${item.productId}`
        );
      }
    }

    productSales.set(
      item.productId,
      (productSales.get(item.productId) ?? 0) +
        item.quantity
    );

    shopSales.set(
      item.shopId,
      (shopSales.get(item.shopId) ?? 0) +
        item.quantity
    );
  }

  /*
   * ============================================================
   * PRODUCT SALES
   * ============================================================
   */

  for (const [
    productId,
    quantity,
  ] of productSales) {
    await tx.product.update({
      where: {
        id: productId,
      },

      data: {
        salesCount: {
          increment: quantity,
        },
      },
    });
  }

  /*
   * ============================================================
   * SHOP SALES
   * ============================================================
   */

  for (const [
    shopId,
    quantity,
  ] of shopSales) {
    await tx.shop.update({
      where: {
        id: shopId,
      },

      data: {
        salesCount: {
          increment: quantity,
        },
      },
    });
  }

  /*
   * ============================================================
   * SELLERS + PAYOUTS
   * ============================================================
   */

  for (const seller of order.sellers) {
    if (
      seller.status !== OrderStatus.CONFIRMED
    ) {
      await tx.orderSeller.update({
        where: {
          id: seller.id,
        },

        data: {
          status: OrderStatus.CONFIRMED,
        },
      });
    }

    /*
     * Один OrderSeller = максимум один payout.
     *
     * orderSellerId має @unique у SellerPayout,
     * тому повторного payout створити не можна.
     */
    if (!seller.payout) {
      await tx.sellerPayout.create({
        data: {
          shopId: seller.shopId,

          orderSellerId: seller.id,

          amount: seller.sellerAmount,

          status: "PENDING",
        },
      });
    }
  }

  /*
   * ============================================================
   * ORDER -> CONFIRMED
   * ============================================================
   */

  const updatedOrder =
    await tx.order.updateMany({
      where: {
        id: order.id,

        status: OrderStatus.PENDING,
      },

      data: {
        status: OrderStatus.CONFIRMED,
      },
    });

  if (updatedOrder.count !== 1) {
    throw new Error(
      "ORDER_STATUS_UPDATE_FAILED"
    );
  }

  return {
    orderId: order.id,
    status: OrderStatus.CONFIRMED,
    finalized: true,
    alreadyFinalized: false,
  };
}

export async function finalizePaidOrder(
  orderId: string,
  tx?: TxClient
): Promise<FinalizePaidOrderResult> {
  /*
   * Якщо виклик уже знаходиться всередині
   * існуючої транзакції — використовуємо її.
   */
  if (tx) {
    return finalizeWithTransaction(
      orderId,
      tx
    );
  }

  /*
   * Якщо виклик зроблено окремо —
   * створюємо власну транзакцію.
   */
  return db.$transaction(
    async (transaction) => {
      return finalizeWithTransaction(
        orderId,
        transaction
      );
    }
  );
}