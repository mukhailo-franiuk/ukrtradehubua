
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

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

  if (
    session.user.isBlocked ||
    session.user.status !== "ACTIVE"
  ) {
    return null;
  }

  return session.user;
}

// =====================================================
// PARAMS
// =====================================================

type RouteContext = {
  params: Promise<{
    id: string;
    returnId: string;
  }>;
};

// =====================================================
// GET /api/orders/[id]/return/[returnId]
// =====================================================

export async function GET(
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

    // -------------------------------------------------
    // PARAMS
    // -------------------------------------------------

    const { id, returnId } = await context.params;

    if (!id || !returnId) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректні параметри запиту",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // RETURN REQUEST
    // -------------------------------------------------

    const returnRequest =
      await db.returnRequest.findFirst({
        where: {
          id: returnId,
          orderId: id,
          userId: user.id,
        },

        include: {
          items: {
            include: {
              orderItem: {
                select: {
                  id: true,
                  orderId: true,
                  productId: true,
                  variantId: true,
                  shopId: true,
                  productTitle: true,
                  sku: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                  createdAt: true,
                },
              },
            },
          },

          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              subtotal: true,
              discountAmount: true,
              deliveryAmount: true,
              total: true,
              customerNote: true,
              shippingAddressId: true,
              shippingMethod: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

    if (!returnRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Запит на повернення не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: returnRequest,
    });
  } catch (error) {
    console.error(
      "GET /api/orders/[id]/return/[returnId] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося отримати запит на повернення",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE /api/orders/[id]/return/[returnId]
// =====================================================
//
// Покупець може скасувати тільки власний запит,
// який ще знаходиться у статусі REQUESTED.
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

    // -------------------------------------------------
    // PARAMS
    // -------------------------------------------------

    const { id, returnId } = await context.params;

    if (!id || !returnId) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректні параметри запиту",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // FIND RETURN REQUEST
    // -------------------------------------------------

    const returnRequest =
      await db.returnRequest.findFirst({
        where: {
          id: returnId,
          orderId: id,
          userId: user.id,
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (!returnRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Запит на повернення не знайдено",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // STATUS CHECK
    // -------------------------------------------------

    if (returnRequest.status !== "REQUESTED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Цей запит на повернення вже не можна скасувати",
          status: returnRequest.status,
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------
    // CANCEL
    // -------------------------------------------------

    const updatedReturnRequest =
      await db.returnRequest.update({
        where: {
          id: returnRequest.id,
        },

        data: {
          status: "CANCELLED",
        },

        include: {
          items: {
            include: {
              orderItem: {
                select: {
                  id: true,
                  orderId: true,
                  productId: true,
                  variantId: true,
                  shopId: true,
                  productTitle: true,
                  sku: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      message: "Запит на повернення скасовано",
      data: updatedReturnRequest,
    });
  } catch (error) {
    console.error(
      "DELETE /api/orders/[id]/return/[returnId] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося скасувати запит на повернення",
      },
      {
        status: 500,
      }
    );
  }
}

