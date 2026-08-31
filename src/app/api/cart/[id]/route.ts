import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateCartItemBody = {
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
// GET /api/cart/[id]
// =====================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID позиції кошика є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    const item = await db.cartItem.findFirst({
      where: {
        id,

        cart: {
          userId: user.id,
        },
      },

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
                rating: true,
                isActive: true,
                sellerStatus: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: "Позицію кошика не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("GET /api/cart/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати позицію кошика",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// PATCH /api/cart/[id]
// =====================================================

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID позиції кошика є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // BODY
    // -------------------------------------------------

    let body: UpdateCartItemBody;

    try {
      body = (await request.json()) as UpdateCartItemBody;
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

    const quantity = body.quantity;

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "quantity повинна бути цілим числом більше 0",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // CART ITEM
    // -------------------------------------------------

    const item = await db.cartItem.findFirst({
      where: {
        id,

        cart: {
          userId: user.id,
        },
      },

      include: {
        product: {
          select: {
            id: true,
            title: true,
            stock: true,
            reservedStock: true,
            status: true,

            shop: {
              select: {
                isActive: true,
                sellerStatus: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: "Позицію кошика не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // PRODUCT STATUS
    // -------------------------------------------------

    if (item.product.status !== "ACTIVE") {
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
    // SHOP STATUS
    // -------------------------------------------------

    if (!item.product.shop.isActive) {
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

    if (
      item.product.shop.sellerStatus !== "ACTIVE"
    ) {
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
    // STOCK
    // -------------------------------------------------

    const availableStock =
      item.product.stock -
      item.product.reservedStock;

    if (availableStock <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Товар закінчився",
          availableStock: 0,
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
    // UPDATE
    // -------------------------------------------------

    const updatedItem =
      await db.cartItem.update({
        where: {
          id: item.id,
        },

        data: {
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

              shop: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  rating: true,
                  isActive: true,
                  sellerStatus: true,
                },
              },
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      message: "Кількість товару оновлено",
      data: updatedItem,
    });
  } catch (error) {
    console.error("PATCH /api/cart/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося оновити кількість товару",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/cart/[id]
// =====================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID позиції кошика є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // FIND ITEM
    // -------------------------------------------------

    const item = await db.cartItem.findFirst({
      where: {
        id,

        cart: {
          userId: user.id,
        },
      },

      select: {
        id: true,
        productId: true,
        quantity: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: "Позицію кошика не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // DELETE
    // -------------------------------------------------

    await db.cartItem.delete({
      where: {
        id: item.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Товар видалено з кошика",
      deletedItemId: item.id,
    });
  } catch (error) {
    console.error(
      "DELETE /api/cart/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося видалити товар з кошика",
      },
      {
        status: 500,
      }
    );
  }
}