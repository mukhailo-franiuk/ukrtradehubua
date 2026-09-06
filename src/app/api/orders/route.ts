import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calculateCommission } from "@/lib/marketplace/commission";

export const runtime = "nodejs";

/*
 * ============================================================
 * ORDER INCLUDE
 * ============================================================
 */

const orderInclude = {
  shippingAddress: true,

  items: {
    include: {
      product: {
        include: {
          images: {
            orderBy: {
              sortOrder: "asc" as const,
            },
          },
        },
      },

      variant: true,

      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },

    orderBy: {
      createdAt: "asc" as const,
    },
  },

  sellers: {
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
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

    orderBy: {
      createdAt: "desc" as const,
    },
  },
} satisfies Prisma.OrderInclude;

/*
 * ============================================================
 * DELIVERY METHODS
 * ============================================================
 */

const DELIVERY_METHODS = [
  "NOVA_POSHTA",
  "UKRPOSHTA",
  "MIST",
  "COURIER",
  "PICKUP",
] as const;

type DeliveryMethod =
  (typeof DELIVERY_METHODS)[number];

/*
 * ============================================================
 * REQUEST BODY
 * ============================================================
 */

type CreateOrderBody = {
  shippingAddressId?: string | null;
  shippingMethod?: string | null;
  customerNote?: string | null;
};

/*
 * ============================================================
 * GET /api/orders
 * ============================================================
 */

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const orders = await db.order.findMany({
      where: {
        userId: user.id,
      },

      include: orderInclude,

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      orders,
    });
  } catch (error) {
    console.error("[ORDERS_GET_ERROR]", error);

    return NextResponse.json(
      {
        error: "Failed to load orders",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================================
 * POST /api/orders
 *
 * Створення замовлення з кошика.
 *
 * На цьому етапі:
 *
 * Product.stock
 *     НЕ зменшуємо.
 *
 * Product.reservedStock
 *     збільшуємо.
 *
 * Після успішної оплати finalizePaidOrder():
 *
 * stock -= quantity
 * reservedStock -= quantity
 *
 * Також:
 *
 * OrderSeller.commissionRate
 * OrderSeller.commissionAmount
 * OrderSeller.sellerAmount
 *
 * фіксуються під час створення замовлення.
 * ============================================================
 */

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ========================================================
     * AUTH
     * ========================================================
     */

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ========================================================
     * BODY
     * ========================================================
     */

    let body: CreateOrderBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON",
        },
        {
          status: 400,
        }
      );
    }

    const shippingAddressId =
      typeof body.shippingAddressId === "string"
        ? body.shippingAddressId.trim() || null
        : null;

    const shippingMethod =
      typeof body.shippingMethod === "string"
        ? body.shippingMethod.trim() || null
        : null;

    const customerNote =
      typeof body.customerNote === "string"
        ? body.customerNote.trim() || null
        : null;

    /*
     * ========================================================
     * DELIVERY METHOD
     * ========================================================
     */

    if (
      shippingMethod &&
      !DELIVERY_METHODS.includes(
        shippingMethod as DeliveryMethod
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid shipping method",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * SHIPPING ADDRESS
     * ========================================================
     */

    if (shippingAddressId) {
      const shippingAddress =
        await db.address.findFirst({
          where: {
            id: shippingAddressId,
            userId: user.id,
          },
        });

      if (!shippingAddress) {
        return NextResponse.json(
          {
            error: "Shipping address not found",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * ========================================================
     * CART
     * ========================================================
     */

    const cart = await db.cart.findUnique({
      where: {
        userId: user.id,
      },

      include: {
        items: {
          include: {
            product: {
              include: {
                shop: true,
              },
            },

            variant: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        {
          error: "Cart is empty",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * PRE-VALIDATION
     * ========================================================
     */

    for (const item of cart.items) {
      /*
       * ------------------------------------------------------
       * QUANTITY
       * ------------------------------------------------------
       */

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return NextResponse.json(
          {
            error: "Invalid cart item quantity",
            itemId: item.id,
          },
          {
            status: 400,
          }
        );
      }

      const product = item.product;
      const shop = product.shop;

      /*
       * ------------------------------------------------------
       * PRODUCT STATUS
       * ------------------------------------------------------
       */

      if (product.status !== "ACTIVE") {
        return NextResponse.json(
          {
            error:
              "One of the products is no longer available",
            productId: product.id,
            productTitle: product.title,
          },
          {
            status: 409,
          }
        );
      }

      /*
       * ------------------------------------------------------
       * SHOP STATUS
       * ------------------------------------------------------
       */

      if (!shop.isActive) {
        return NextResponse.json(
          {
            error:
              "One of the shops is currently inactive",
            shopId: shop.id,
            shopName: shop.name,
          },
          {
            status: 409,
          }
        );
      }

      /*
       * ------------------------------------------------------
       * SELLER STATUS
       * ------------------------------------------------------
       */

      if (shop.sellerStatus !== "ACTIVE") {
        return NextResponse.json(
          {
            error:
              "One of the sellers is currently unavailable",
            shopId: shop.id,
            shopName: shop.name,
          },
          {
            status: 409,
          }
        );
      }

      /*
       * ======================================================
       * VARIANT
       * ======================================================
       */

      if (item.variantId) {
        const variant = item.variant;

        if (!variant) {
          return NextResponse.json(
            {
              error: "Product variant not found",
              productId: product.id,
              variantId: item.variantId,
            },
            {
              status: 409,
            }
          );
        }

        /*
         * Variant повинен належати Product.
         */

        if (
          variant.productId !== product.id
        ) {
          return NextResponse.json(
            {
              error:
                "Product variant mismatch",
              productId: product.id,
              variantId: variant.id,
            },
            {
              status: 409,
            }
          );
        }

        /*
         * Variant active.
         */

        if (!variant.isActive) {
          return NextResponse.json(
            {
              error:
                "Product variant is no longer available",
              productId: product.id,
              variantId: variant.id,
            },
            {
              status: 409,
            }
          );
        }

        /*
         * Available variant stock.
         */

        const available =
          variant.stock -
          variant.reservedStock;

        if (
          available < item.quantity
        ) {
          return NextResponse.json(
            {
              error:
                "Not enough product variant stock",
              productId: product.id,
              variantId: variant.id,
              requested: item.quantity,
              available,
            },
            {
              status: 409,
            }
          );
        }
      } else {
        /*
         * ====================================================
         * PRODUCT WITHOUT VARIANT
         * ====================================================
         */

        const available =
          product.stock -
          product.reservedStock;

        if (
          available < item.quantity
        ) {
          return NextResponse.json(
            {
              error:
                "Not enough product stock",
              productId: product.id,
              productTitle: product.title,
              requested: item.quantity,
              available,
            },
            {
              status: 409,
            }
          );
        }
      }
    }

    /*
     * ========================================================
     * TRANSACTION
     * ========================================================
     */

    const order = await db.$transaction(
      async (tx) => {
        /*
         * ====================================================
         * RELOAD CART
         * ====================================================
         */

        const currentCart =
          await tx.cart.findUnique({
            where: {
              id: cart.id,
            },

            include: {
              items: {
                include: {
                  product: {
                    include: {
                      shop: true,
                    },
                  },

                  variant: true,
                },

                orderBy: {
                  createdAt: "asc",
                },
              },
            },
          });

        if (
          !currentCart ||
          currentCart.items.length === 0
        ) {
          throw new Error("CART_EMPTY");
        }

        /*
         * ====================================================
         * SECOND VALIDATION
         * ====================================================
         */

        for (const item of currentCart.items) {
          if (
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
          ) {
            throw new Error(
              `INVALID_QUANTITY:${item.id}`
            );
          }

          const product = item.product;
          const shop = product.shop;

          if (product.status !== "ACTIVE") {
            throw new Error(
              `PRODUCT_NOT_ACTIVE:${product.id}`
            );
          }

          if (!shop.isActive) {
            throw new Error(
              `SHOP_NOT_ACTIVE:${shop.id}`
            );
          }

          if (shop.sellerStatus !== "ACTIVE") {
            throw new Error(
              `SELLER_NOT_ACTIVE:${shop.id}`
            );
          }

          if (item.variantId) {
            if (!item.variant) {
              throw new Error(
                `VARIANT_NOT_FOUND:${item.variantId}`
              );
            }

            if (
              item.variant.productId !==
              product.id
            ) {
              throw new Error(
                `VARIANT_PRODUCT_MISMATCH:${item.variantId}`
              );
            }

            if (!item.variant.isActive) {
              throw new Error(
                `VARIANT_NOT_ACTIVE:${item.variantId}`
              );
            }
          }
        }

        /*
         * ====================================================
         * CALCULATE ORDER SUBTOTAL
         * ====================================================
         */

        let subtotal =
          new Prisma.Decimal(0);

        for (const item of currentCart.items) {
          const price =
            item.variant?.price ??
            item.product.price;

          subtotal =
            subtotal.add(
              price.mul(item.quantity)
            );
        }

        /*
         * ====================================================
         * DISCOUNT
         * ====================================================
         */

        const discountAmount =
          new Prisma.Decimal(0);

        /*
         * ====================================================
         * DELIVERY
         * ====================================================
         */

        const deliveryAmount =
          new Prisma.Decimal(0);

        /*
         * ====================================================
         * ORDER TOTAL
         * ====================================================
         */

        const total =
          subtotal
            .sub(discountAmount)
            .add(deliveryAmount);

        /*
         * ====================================================
         * ORDER NUMBER
         * ====================================================
         */

        const orderNumber =
          await generateOrderNumber(tx);

        /*
         * ====================================================
         * CREATE ORDER
         * ====================================================
         */

        const createdOrder =
          await tx.order.create({
            data: {
              userId: user.id,

              orderNumber,

              status: "PENDING",

              subtotal,

              discountAmount,

              deliveryAmount,

              total,

              customerNote,

              shippingAddressId,

              shippingMethod:
                shippingMethod
                  ? (shippingMethod as DeliveryMethod)
                  : null,
            },
          });

        /*
         * ====================================================
         * GROUP ITEMS BY SHOP
         * ====================================================
         */

        const itemsByShop =
          new Map<
            string,
            typeof currentCart.items
          >();

        for (const item of currentCart.items) {
          const shopId =
            item.product.shopId;

          const existing =
            itemsByShop.get(shopId);

          if (existing) {
            existing.push(item);
          } else {
            itemsByShop.set(
              shopId,
              [item]
            );
          }
        }

        /*
         * ====================================================
         * CREATE ORDER SELLERS
         *
         * Тут фіксуємо:
         *
         * subtotal
         * shipping
         * total
         * commissionRate
         * commissionAmount
         * sellerAmount
         *
         * Комісія рахується від subtotal.
         * Доставка не входить у базу комісії.
         * ====================================================
         */

        for (const [
          shopId,
          shopItems,
        ] of itemsByShop) {
          let sellerSubtotal =
            new Prisma.Decimal(0);

          for (const item of shopItems) {
            const price =
              item.variant?.price ??
              item.product.price;

            sellerSubtotal =
              sellerSubtotal.add(
                price.mul(item.quantity)
              );
          }

          /*
           * --------------------------------------------------
           * SHIPPING
           * --------------------------------------------------
           *
           * Поки що доставка = 0.
           */

          const shipping =
            new Prisma.Decimal(0);

          /*
           * --------------------------------------------------
           * SELLER TOTAL
           * --------------------------------------------------
           */

          const sellerTotal =
            sellerSubtotal.add(
              shipping
            );

          /*
           * --------------------------------------------------
           * COMMISSION
           * --------------------------------------------------
           *
           * calculateCommission() працює з Decimal.
           */

          const commission =
            calculateCommission(
              sellerSubtotal
            );

          /*
           * --------------------------------------------------
           * CREATE ORDER SELLER
           * --------------------------------------------------
           */

          await tx.orderSeller.create({
            data: {
              orderId:
                createdOrder.id,

              shopId,

              subtotal:
                sellerSubtotal,

              shipping,

              total:
                sellerTotal,

              commissionRate:
                commission.rate,

              commissionAmount:
                commission.amount,

              sellerAmount:
                commission.sellerAmount,

              status: "PENDING",
            },
          });
        }

        /*
         * ====================================================
         * CREATE ORDER ITEMS
         * + RESERVE STOCK
         * ====================================================
         */

        for (const item of currentCart.items) {
          /*
           * --------------------------------------------------
           * PRICE
           * --------------------------------------------------
           */

          const price =
            item.variant?.price ??
            item.product.price;

          const totalPrice =
            price.mul(item.quantity);

          /*
           * --------------------------------------------------
           * SKU
           * --------------------------------------------------
           */

          const sku =
            item.variant?.sku ??
            item.product.sku ??
            null;

          /*
           * --------------------------------------------------
           * CREATE ORDER ITEM
           * --------------------------------------------------
           */

          await tx.orderItem.create({
            data: {
              orderId:
                createdOrder.id,

              productId:
                item.productId,

              variantId:
                item.variantId,

              shopId:
                item.product.shopId,

              productTitle:
                item.product.title,

              sku,

              quantity:
                item.quantity,

              unitPrice:
                price,

              totalPrice,
            },
          });

          /*
           * ==================================================
           * RESERVE VARIANT STOCK
           * ==================================================
           */

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

            if (!variant.isActive) {
              throw new Error(
                `VARIANT_NOT_ACTIVE:${item.variantId}`
              );
            }

            if (
              variant.productId !==
              item.productId
            ) {
              throw new Error(
                `VARIANT_PRODUCT_MISMATCH:${item.variantId}`
              );
            }

            const available =
              variant.stock -
              variant.reservedStock;

            if (
              available <
              item.quantity
            ) {
              throw new Error(
                `VARIANT_STOCK_CHANGED:${item.variantId}`
              );
            }

            /*
             * Атомарне резервування.
             */

            const reserved =
              await tx.productVariant.updateMany({
                where: {
                  id: item.variantId,

                  stock: {
                    gte:
                      variant.reservedStock +
                      item.quantity,
                  },

                  reservedStock: {
                    gte: 0,
                  },
                },

                data: {
                  reservedStock: {
                    increment:
                      item.quantity,
                  },
                },
              });

            if (reserved.count !== 1) {
              throw new Error(
                `VARIANT_STOCK_CHANGED:${item.variantId}`
              );
            }
          } else {
            /*
             * =================================================
             * RESERVE PRODUCT STOCK
             * =================================================
             */

            const product =
              await tx.product.findUnique({
                where: {
                  id: item.productId,
                },

                include: {
                  shop: true,
                },
              });

            if (!product) {
              throw new Error(
                `PRODUCT_NOT_FOUND:${item.productId}`
              );
            }

            if (product.status !== "ACTIVE") {
              throw new Error(
                `PRODUCT_NOT_ACTIVE:${item.productId}`
              );
            }

            if (!product.shop.isActive) {
              throw new Error(
                `SHOP_NOT_ACTIVE:${product.shopId}`
              );
            }

            if (
              product.shop.sellerStatus !==
              "ACTIVE"
            ) {
              throw new Error(
                `SELLER_NOT_ACTIVE:${product.shopId}`
              );
            }

            const available =
              product.stock -
              product.reservedStock;

            if (
              available <
              item.quantity
            ) {
              throw new Error(
                `PRODUCT_STOCK_CHANGED:${item.productId}`
              );
            }

            /*
             * Атомарне резервування.
             */

            const reserved =
              await tx.product.updateMany({
                where: {
                  id: item.productId,

                  stock: {
                    gte:
                      product.reservedStock +
                      item.quantity,
                  },

                  reservedStock: {
                    gte: 0,
                  },
                },

                data: {
                  reservedStock: {
                    increment:
                      item.quantity,
                  },
                },
              });

            if (reserved.count !== 1) {
              throw new Error(
                `PRODUCT_STOCK_CHANGED:${item.productId}`
              );
            }
          }
        }

        /*
         * ====================================================
         * SHOP ORDERS COUNT
         * ====================================================
         *
         * Один OrderSeller = одне замовлення продавця.
         *
         * ordersCount збільшуємо один раз на магазин.
         *
         * salesCount тут НЕ змінюємо.
         * ====================================================
         */

        for (const [
          shopId,
        ] of itemsByShop) {
          await tx.shop.update({
            where: {
              id: shopId,
            },

            data: {
              ordersCount: {
                increment: 1,
              },
            },
          });
        }

        /*
         * ====================================================
         * CLEAR CART
         * ====================================================
         */

        await tx.cartItem.deleteMany({
          where: {
            cartId:
              currentCart.id,
          },
        });

        /*
         * ====================================================
         * RETURN CREATED ORDER
         * ====================================================
         */

        return tx.order.findUnique({
          where: {
            id: createdOrder.id,
          },

          include: orderInclude,
        });
      }
    );

    /*
     * ========================================================
     * ORDER NOT FOUND
     * ========================================================
     */

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Failed to create order",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ========================================================
     * SUCCESS
     * ========================================================
     */

    return NextResponse.json(
      {
        ok: true,
        order,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "[ORDERS_POST_ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    /*
     * ========================================================
     * CART EMPTY
     * ========================================================
     */

    if (message === "CART_EMPTY") {
      return NextResponse.json(
        {
          error: "Cart is empty",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * INVALID QUANTITY
     * ========================================================
     */

    if (
      message.startsWith(
        "INVALID_QUANTITY:"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "У кошику виявлена некоректна кількість товару.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * STOCK CHANGED
     * ========================================================
     */

    if (
      message.startsWith(
        "PRODUCT_STOCK_CHANGED:"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Кількість товару змінилася. Оновіть кошик і спробуйте ще раз.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      message.startsWith(
        "VARIANT_STOCK_CHANGED:"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Кількість вибраного варіанту змінилася. Оновіть кошик і спробуйте ще раз.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ========================================================
     * PRODUCT / VARIANT / SHOP STATUS
     * ========================================================
     */

    if (
      message.startsWith(
        "PRODUCT_NOT_ACTIVE:"
      ) ||
      message.startsWith(
        "VARIANT_NOT_ACTIVE:"
      ) ||
      message.startsWith(
        "SHOP_NOT_ACTIVE:"
      ) ||
      message.startsWith(
        "SELLER_NOT_ACTIVE:"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Один із товарів більше недоступний для замовлення.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ========================================================
     * NOT FOUND
     * ========================================================
     */

    if (
      message.startsWith(
        "VARIANT_NOT_FOUND:"
      ) ||
      message.startsWith(
        "PRODUCT_NOT_FOUND:"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Один із товарів більше не існує.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ========================================================
     * VARIANT MISMATCH
     * ========================================================
     */

    if (
      message.startsWith(
        "VARIANT_PRODUCT_MISMATCH:"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Невірний варіант товару.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ========================================================
     * ORDER NUMBER
     * ========================================================
     */

    if (
      message ===
      "ORDER_NUMBER_GENERATION_FAILED"
    ) {
      return NextResponse.json(
        {
          error:
            "Не вдалося згенерувати номер замовлення. Спробуйте ще раз.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ========================================================
     * PRISMA UNIQUE
     * ========================================================
     */

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Не вдалося створити унікальний номер замовлення. Спробуйте ще раз.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ========================================================
     * DEFAULT ERROR
     * ========================================================
     */

    return NextResponse.json(
      {
        error:
          "Не вдалося створити замовлення",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================================
 * GENERATE ORDER NUMBER
 * ============================================================
 */

async function generateOrderNumber(
  tx: Prisma.TransactionClient
): Promise<string> {
  const date = new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (
    let attempt = 0;
    attempt < 10;
    attempt++
  ) {
    let suffix = "";

    for (
      let i = 0;
      i < 6;
      i++
    ) {
      suffix +=
        characters[
          Math.floor(
            Math.random() *
              characters.length
          )
        ];
    }

    const orderNumber =
      `UTH-${year}${month}${day}-${suffix}`;

    const exists =
      await tx.order.findUnique({
        where: {
          orderNumber,
        },

        select: {
          id: true,
        },
      });

    if (!exists) {
      return orderNumber;
    }
  }

  throw new Error(
    "ORDER_NUMBER_GENERATION_FAILED"
  );
}