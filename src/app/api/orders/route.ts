
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type CreateOrderBody = {
  shippingAddressId?: string | null;
  shippingMethod?: "NOVA_POSHTA" | "UKRPOSHTA" | "MIST" | "COURIER" | "PICKUP" | null;
  customerNote?: string | null;
};

// =====================================================
// AUTH
// =====================================================

async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    return null;
  }

  const session = await db.session.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    return null;
  }

  if (session.user.isBlocked) {
    return null;
  }

  if (session.user.status !== "ACTIVE") {
    return null;
  }

  return session.user;
}

// =====================================================
// ORDER INCLUDE
// =====================================================

const orderInclude = {
  shippingAddress: true,

  items: {
    orderBy: {
      createdAt: "asc" as const,
    },

    include: {
      product: {
        include: {
          images: {
            orderBy: {
              sortOrder: "asc" as const,
            },
            take: 1,
          },
        },
      },

      variant: true,

      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          rating: true,
        },
      },
    },
  },

  sellers: {
    orderBy: {
      createdAt: "asc" as const,
    },

    include: {
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          rating: true,
        },
      },
    },
  },

  payments: true,

  delivery: true,
};

// =====================================================
// GET /api/orders
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
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

      orderBy: {
        createdAt: "desc",
      },

      include: orderInclude,
    });

    return NextResponse.json({
      success: true,
      data: orders,
      total: orders.length,
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати замовлення",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/orders
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // ===================================================
    // AUTH
    // ===================================================

    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Необхідна авторизація",
        },
        {
          status: 401,
        }
      );
    }

    // ===================================================
    // BODY
    // ===================================================

    let body: CreateOrderBody;

    try {
      body = (await request.json()) as CreateOrderBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        {
          status: 400,
        }
      );
    }

    const shippingAddressId =
      body.shippingAddressId?.trim() || null;

    const shippingMethod =
      body.shippingMethod ?? null;

    const customerNote =
      body.customerNote?.trim() || null;

    // ===================================================
    // VALIDATE SHIPPING ADDRESS
    // ===================================================

    if (shippingAddressId) {
      const address = await db.address.findFirst({
        where: {
          id: shippingAddressId,
          userId: user.id,
        },

        select: {
          id: true,
        },
      });

      if (!address) {
        return NextResponse.json(
          {
            success: false,
            error: "Адресу доставки не знайдено",
          },
          {
            status: 404,
          }
        );
      }
    }

    // ===================================================
    // CART
    // ===================================================

    const cart = await db.cart.findUnique({
      where: {
        userId: user.id,
      },

      include: {
        items: {
          orderBy: {
            createdAt: "asc",
          },

          include: {
            product: {
              include: {
                shop: true,
              },
            },

            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Кошик порожній",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // VALIDATE CART
    // ===================================================

    for (const item of cart.items) {
      const product = item.product;

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error: "Один із товарів у кошику більше не існує",
          },
          {
            status: 409,
          }
        );
      }

      if (product.status !== "ACTIVE") {
        return NextResponse.json(
          {
            success: false,
            error: `Товар "${product.title}" більше недоступний`,
            productId: product.id,
          },
          {
            status: 409,
          }
        );
      }

      if (!product.shop) {
        return NextResponse.json(
          {
            success: false,
            error: `Для товару "${product.title}" не знайдено магазин`,
            productId: product.id,
          },
          {
            status: 409,
          }
        );
      }

      if (!product.shop.isActive) {
        return NextResponse.json(
          {
            success: false,
            error: `Магазин "${product.shop.name}" неактивний`,
            shopId: product.shop.id,
          },
          {
            status: 409,
          }
        );
      }

      if (product.shop.sellerStatus !== "ACTIVE") {
        return NextResponse.json(
          {
            success: false,
            error: `Продавець магазину "${product.shop.name}" неактивний`,
            shopId: product.shop.id,
          },
          {
            status: 409,
          }
        );
      }

      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json(
          {
            success: false,
            error: `Некоректна кількість товару "${product.title}"`,
            productId: product.id,
          },
          {
            status: 400,
          }
        );
      }

      // -------------------------------------------------
      // VARIANT VALIDATION
      // -------------------------------------------------

      if (item.variantId && !item.variant) {
        return NextResponse.json(
          {
            success: false,
            error: `Варіант товару "${product.title}" більше не існує`,
            productId: product.id,
            variantId: item.variantId,
          },
          {
            status: 409,
          }
        );
      }

      if (item.variant && !item.variant.isActive) {
        return NextResponse.json(
          {
            success: false,
            error: `Варіант товару "${product.title}" більше недоступний`,
            productId: product.id,
            variantId: item.variant.id,
          },
          {
            status: 409,
          }
        );
      }

      // -------------------------------------------------
      // STOCK VALIDATION
      // -------------------------------------------------

      if (item.variant) {
        const availableVariantStock =
          item.variant.stock - item.variant.reservedStock;

        if (availableVariantStock < item.quantity) {
          return NextResponse.json(
            {
              success: false,
              error: `Недостатньо товару "${product.title}" у вибраному варіанті`,
              productId: product.id,
              variantId: item.variant.id,
              available: Math.max(availableVariantStock, 0),
              requested: item.quantity,
            },
            {
              status: 409,
            }
          );
        }
      } else {
        const availableStock =
          product.stock - product.reservedStock;

        if (availableStock < item.quantity) {
          return NextResponse.json(
            {
              success: false,
              error: `Недостатньо товару "${product.title}"`,
              productId: product.id,
              available: Math.max(availableStock, 0),
              requested: item.quantity,
            },
            {
              status: 409,
            }
          );
        }
      }
    }

    // ===================================================
    // CREATE ORDER
    // ===================================================

    const order = await db.$transaction(
      async (tx) => {
        // -------------------------------------------------
        // CALCULATE TOTALS
        // -------------------------------------------------

        let subtotal = 0;

        for (const item of cart.items) {
          const price = item.variant?.price != null
            ? Number(item.variant.price)
            : Number(item.product.price);

          subtotal += price * item.quantity;
        }

        const discountAmount = 0;
        const deliveryAmount = 0;

        const total =
          subtotal -
          discountAmount +
          deliveryAmount;

        // -------------------------------------------------
        // ORDER NUMBER
        // -------------------------------------------------

        const orderNumber =
          `UTH-${Date.now()}-${Math.floor(
            Math.random() * 10000
          )
            .toString()
            .padStart(4, "0")}`;

        // -------------------------------------------------
        // CREATE ORDER
        // -------------------------------------------------

        const createdOrder = await tx.order.create({
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

            shippingMethod,
          },
        });

        // -------------------------------------------------
        // GROUP CART ITEMS BY SHOP
        // -------------------------------------------------

        const itemsByShop = new Map<
          string,
          typeof cart.items
        >();

        for (const item of cart.items) {
          const shopId = item.product.shopId;

          const shopItems =
            itemsByShop.get(shopId) ?? [];

          shopItems.push(item);

          itemsByShop.set(shopId, shopItems);
        }

        // -------------------------------------------------
        // CREATE ORDER SELLERS + ORDER ITEMS
        // -------------------------------------------------

        for (const [shopId, shopItems] of itemsByShop) {
          let sellerSubtotal = 0;

          for (const item of shopItems) {
            const price = item.variant?.price != null
              ? Number(item.variant.price)
              : Number(item.product.price);

            sellerSubtotal +=
              price * item.quantity;
          }

          const sellerShipping = 0;

          const sellerTotal =
            sellerSubtotal +
            sellerShipping;

          // -----------------------------------------------
          // ORDER SELLER
          // -----------------------------------------------

          await tx.orderSeller.create({
            data: {
              orderId: createdOrder.id,

              shopId,

              subtotal: sellerSubtotal,

              shipping: sellerShipping,

              total: sellerTotal,

              status: "PENDING",
            },
          });

          // -----------------------------------------------
          // ORDER ITEMS
          // -----------------------------------------------

          for (const item of shopItems) {
            const price = item.variant?.price != null
              ? Number(item.variant.price)
              : Number(item.product.price);

            const itemTotal =
              price * item.quantity;

            await tx.orderItem.create({
              data: {
                orderId: createdOrder.id,

                productId: item.productId,

                variantId: item.variantId,

                shopId,

                productTitle: item.product.title,

                sku:
                  item.variant?.sku ??
                  item.product.sku ??
                  null,

                quantity: item.quantity,

                unitPrice: price,

                totalPrice: itemTotal,
              },
            });

            // ---------------------------------------------
            // RESERVE STOCK
            // ---------------------------------------------

            if (item.variantId) {
              const updatedVariant =
                await tx.productVariant.updateMany({
                  where: {
                    id: item.variantId,

                    isActive: true,

                    stock: {
                      gte: item.quantity,
                    },

                    reservedStock: {
                      lte:
                        item.variant!.stock -
                        item.quantity,
                    },
                  },

                  data: {
                    reservedStock: {
                      increment: item.quantity,
                    },
                  },
                });

              if (updatedVariant.count !== 1) {
                throw new Error(
                  `VARIANT_STOCK_CHANGED:${item.variantId}`
                );
              }
            } else {
              const updatedProduct =
                await tx.product.updateMany({
                  where: {
                    id: item.productId,

                    status: "ACTIVE",

                    stock: {
                      gte: item.quantity,
                    },

                    reservedStock: {
                      lte:
                        item.product.stock -
                        item.quantity,
                    },
                  },

                  data: {
                    reservedStock: {
                      increment: item.quantity,
                    },
                  },
                });

              if (updatedProduct.count !== 1) {
                throw new Error(
                  `STOCK_CHANGED:${item.productId}`
                );
              }
            }

            // ---------------------------------------------
            // PRODUCT COUNTERS
            // ---------------------------------------------

            await tx.product.update({
              where: {
                id: item.productId,
              },

              data: {
                salesCount: {
                  increment: item.quantity,
                },
              },
            });
          }

          // ---------------------------------------------
          // SHOP COUNTERS
          // ---------------------------------------------

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

        // -------------------------------------------------
        // CLEAR CART
        // -------------------------------------------------

        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
          },
        });

        // -------------------------------------------------
        // RETURN COMPLETE ORDER
        // -------------------------------------------------

        return tx.order.findUniqueOrThrow({
          where: {
            id: createdOrder.id,
          },

          include: orderInclude,
        });
      }
    );

    // ===================================================
    // SUCCESS
    // ===================================================

    return NextResponse.json(
      {
        success: true,
        message: "Замовлення успішно створено",
        data: order,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);

    // ===================================================
    // STOCK CHANGED
    // ===================================================

    if (
      error instanceof Error &&
      error.message.startsWith("STOCK_CHANGED:")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Залишок товару змінився. Оновіть кошик і спробуйте ще раз.",
        },
        {
          status: 409,
        }
      );
    }

    // ===================================================
    // VARIANT STOCK CHANGED
    // ===================================================

    if (
      error instanceof Error &&
      error.message.startsWith("VARIANT_STOCK_CHANGED:")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Залишок вибраного варіанту змінився. Оновіть кошик і спробуйте ще раз.",
        },
        {
          status: 409,
        }
      );
    }

    // ===================================================
    // PRISMA UNIQUE
    // ===================================================

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Замовлення з таким номером вже існує. Спробуйте ще раз.",
        },
        {
          status: 409,
        }
      );
    }

    // ===================================================
    // DEFAULT ERROR
    // ===================================================

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити замовлення",
      },
      {
        status: 500,
      }
    );
  }
}
