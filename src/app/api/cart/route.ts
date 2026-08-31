import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type AddToCartBody = {
  productId?: string;
  quantity?: number;
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

  return session.user;
}

// =====================================================
// GET /api/cart
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

    const cart = await db.cart.findUnique({
      where: {
        userId: user.id,
      },

      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },

                shop: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    sellerStatus: true,
                    isActive: true,
                    rating: true,
                  },
                },
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({
        success: true,
        data: {
          id: null,
          userId: user.id,
          items: [],
          totalItems: 0,
        },
      });
    }

    const totalItems = cart.items.reduce(
      (total, item) => total + item.quantity,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        ...cart,
        totalItems,
      },
    });
  } catch (error) {
    console.error("GET /api/cart error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати кошик",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/cart
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // -------------------------------------------------
    // AUTH
    // -------------------------------------------------

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

    // -------------------------------------------------
    // BODY
    // -------------------------------------------------

    let body: AddToCartBody;

    try {
      body = (await request.json()) as AddToCartBody;
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

    const productId = body.productId?.trim();
    const quantity = body.quantity ?? 1;

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "productId є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Кількість повинна бути цілим числом більше 0",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // PRODUCT
    // -------------------------------------------------

    const product = await db.product.findUnique({
      where: {
        id: productId,
      },

      select: {
        id: true,
        title: true,
        price: true,
        stock: true,
        reservedStock: true,
        status: true,

        shopId: true,

        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            sellerStatus: true,
          },
        },

        images: {
          orderBy: {
            sortOrder: "asc",
          },
          take: 1,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Товар не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // PRODUCT STATUS
    // -------------------------------------------------

    if (product.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Цей товар зараз недоступний для покупки",
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // SHOP
    // -------------------------------------------------

    if (!product.shop.isActive) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Магазин цього товару зараз неактивний",
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
          error:
            "Продавець цього товару зараз неактивний",
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // AVAILABLE STOCK
    // -------------------------------------------------

    const availableStock =
      product.stock - product.reservedStock;

    if (availableStock <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Товар закінчився",
        },
        {
          status: 409,
        }
      );
    }

    if (quantity > availableStock) {
      return NextResponse.json(
        {
          success: false,
          error: `Доступно лише ${availableStock} шт.`,
          availableStock,
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // CART
    // -------------------------------------------------

    const result = await db.$transaction(
      async (tx) => {
        const cart = await tx.cart.upsert({
          where: {
            userId: user.id,
          },

          create: {
            userId: user.id,
          },

          update: {},
        });

        // ---------------------------------------------
        // EXISTING ITEM
        // ---------------------------------------------

        const existingItem =
          await tx.cartItem.findUnique({
            where: {
              cartId_productId: {
                cartId: cart.id,
                productId,
              },
            },
          });

        if (existingItem) {
          const newQuantity =
            existingItem.quantity + quantity;

          if (newQuantity > availableStock) {
            throw new Error(
              `CART_STOCK:${availableStock}`
            );
          }

          return tx.cartItem.update({
            where: {
              id: existingItem.id,
            },

            data: {
              quantity: newQuantity,
            },

            include: {
              product: {
                include: {
                  images: {
                    orderBy: {
                      sortOrder: "asc",
                    },
                  },
                },
              },
            },
          });
        }

        // ---------------------------------------------
        // NEW ITEM
        // ---------------------------------------------

        return tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
          },

          include: {
            product: {
              include: {
                images: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
              },
            },
          },
        });
      }
    );

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: "Товар додано до кошика",
        data: result,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST /api/cart error:", error);

    // -------------------------------------------------
    // STOCK ERROR
    // -------------------------------------------------

    if (
      error instanceof Error &&
      error.message.startsWith("CART_STOCK:")
    ) {
      const availableStock = Number(
        error.message.replace("CART_STOCK:", "")
      );

      return NextResponse.json(
        {
          success: false,
          error: `Недостатньо товару. Доступно лише ${availableStock} шт.`,
          availableStock,
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // PRISMA UNIQUE
    // -------------------------------------------------

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
            "Товар вже знаходиться у кошику",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося додати товар до кошика",
      },
      {
        status: 500,
      }
    );
  }
}