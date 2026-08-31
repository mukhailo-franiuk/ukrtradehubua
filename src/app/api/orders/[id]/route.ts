
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
// GET /api/orders/[id]
// =====================================================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
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
    // PARAMS
    // ===================================================

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID замовлення є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // FIND ORDER
    // ===================================================

    const order = await db.order.findFirst({
      where: {
        id,

        userId: user.id,
      },

      include: orderInclude,
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Замовлення не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // SUCCESS
    // ===================================================

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error(
      "GET /api/orders/[id] error:",
      error
    );

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
// PATCH /api/orders/[id]
// =====================================================

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
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
    // PARAMS
    // ===================================================

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID замовлення є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // FIND ORDER
    // ===================================================

    const existingOrder = await db.order.findFirst({
      where: {
        id,
        userId: user.id,
      },

      select: {
        id: true,
        status: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "Замовлення не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // BODY
    // ===================================================

    let body: {
      customerNote?: string | null;
    };

    try {
      body = await request.json();
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

    // ===================================================
    // ALLOWED FIELDS
    // ===================================================

    if (
      body.customerNote !== undefined &&
      body.customerNote !== null &&
      typeof body.customerNote !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "customerNote має бути рядком або null",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // UPDATE CUSTOMER NOTE
    // ===================================================

    const customerNote =
      body.customerNote === null
        ? null
        : body.customerNote?.trim() || null;

    const order = await db.order.update({
      where: {
        id: existingOrder.id,
      },

      data: {
        customerNote,
      },

      include: orderInclude,
    });

    // ===================================================
    // SUCCESS
    // ===================================================

    return NextResponse.json({
      success: true,
      message: "Замовлення оновлено",
      data: order,
    });
  } catch (error) {
    console.error(
      "PATCH /api/orders/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося оновити замовлення",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/orders/[id]
// =====================================================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
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
    // PARAMS
    // ===================================================

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ID замовлення є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    // ===================================================
    // FIND ORDER
    // ===================================================

    const order = await db.order.findFirst({
      where: {
        id,
        userId: user.id,
      },

      include: {
        items: {
          select: {
            id: true,
            productId: true,
            variantId: true,
            quantity: true,
          },
        },

        sellers: {
          select: {
            id: true,
            shopId: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Замовлення не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // ===================================================
    // ONLY PENDING ORDERS CAN BE CANCELLED
    // ===================================================

    if (order.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Скасувати можна лише замовлення зі статусом PENDING",
          status: order.status,
        },
        {
          status: 409,
        }
      );
    }

    // ===================================================
    // CANCEL ORDER + RELEASE STOCK
    // ===================================================

    await db.$transaction(async (tx) => {
      // -----------------------------------------------
      // RELEASE PRODUCT / VARIANT STOCK
      // -----------------------------------------------

      for (const item of order.items) {
        if (item.variantId) {
          const variant =
            await tx.productVariant.findUnique({
              where: {
                id: item.variantId,
              },

              select: {
                id: true,
                reservedStock: true,
              },
            });

          if (variant) {
            await tx.productVariant.update({
              where: {
                id: variant.id,
              },

              data: {
                reservedStock: Math.max(
                  0,
                  variant.reservedStock -
                    item.quantity
                ),
              },
            });
          }
        } else {
          const product =
            await tx.product.findUnique({
              where: {
                id: item.productId,
              },

              select: {
                id: true,
                reservedStock: true,
              },
            });

          if (product) {
            await tx.product.update({
              where: {
                id: product.id,
              },

              data: {
                reservedStock: Math.max(
                  0,
                  product.reservedStock -
                    item.quantity
                ),
              },
            });
          }
        }
      }

      // -----------------------------------------------
      // ORDER STATUS
      // -----------------------------------------------

      await tx.order.update({
        where: {
          id: order.id,
        },

        data: {
          status: "CANCELLED",
        },
      });

      // -----------------------------------------------
      // SELLER ORDER STATUS
      // -----------------------------------------------

      await tx.orderSeller.updateMany({
        where: {
          orderId: order.id,
        },

        data: {
          status: "CANCELLED",
        },
      });
    });

    // ===================================================
    // RETURN UPDATED ORDER
    // ===================================================

    const updatedOrder =
      await db.order.findUniqueOrThrow({
        where: {
          id: order.id,
        },

        include: orderInclude,
      });

    // ===================================================
    // SUCCESS
    // ===================================================

    return NextResponse.json({
      success: true,
      message: "Замовлення скасовано",
      data: updatedOrder,
    });
  } catch (error) {
    console.error(
      "DELETE /api/orders/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося скасувати замовлення",
      },
      {
        status: 500,
      }
    );
  }
}

