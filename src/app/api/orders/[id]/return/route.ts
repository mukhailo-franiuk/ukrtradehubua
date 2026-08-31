
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type ReturnReason =
  | "DEFECTIVE"
  | "WRONG_ITEM"
  | "NOT_AS_DESCRIBED"
  | "DAMAGED"
  | "CHANGED_MIND"
  | "OTHER";

type ReturnItemInput = {
  orderItemId?: string;
  quantity?: number;
};

type CreateReturnBody = {
  reason?: ReturnReason;
  comment?: string | null;
  items?: ReturnItemInput[];
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

  if (
    session.user.isBlocked ||
    session.user.status !== "ACTIVE"
  ) {
    return null;
  }

  return session.user;
}

// =====================================================
// GET /api/orders/[id]/return
// =====================================================

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
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
          error: "ID замовлення є обов'язковим",
        },
        {
          status: 400,
        }
      );
    }

    const order = await db.order.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
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

    const returnRequests =
      await db.returnRequest.findMany({
        where: {
          orderId: order.id,
          userId: user.id,
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          items: {
            include: {
              orderItem: {
                select: {
                  id: true,
                  productId: true,
                  variantId: true,
                  shopId: true,
                  productTitle: true,
                  sku: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                },
              },
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      data: returnRequests,
      total: returnRequests.length,
    });
  } catch (error) {
    console.error(
      "GET /api/orders/[id]/return error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати повернення",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/orders/[id]/return
// =====================================================

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    // =================================================
    // AUTH
    // =================================================

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

    // =================================================
    // PARAMS
    // =================================================

    const { id } = await context.params;

    if (!id) {
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

    // =================================================
    // BODY
    // =================================================

    let body: CreateReturnBody;

    try {
      body = (await request.json()) as CreateReturnBody;
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

    const reason = body.reason;

    const allowedReasons: ReturnReason[] = [
      "DEFECTIVE",
      "WRONG_ITEM",
      "NOT_AS_DESCRIBED",
      "DAMAGED",
      "CHANGED_MIND",
      "OTHER",
    ];

    if (
      !reason ||
      !allowedReasons.includes(reason)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректна причина повернення",
        },
        {
          status: 400,
        }
      );
    }

    const comment =
      body.comment?.trim() || null;

    // =================================================
    // ITEMS VALIDATION
    // =================================================

    if (
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Необхідно вказати хоча б один товар для повернення",
        },
        {
          status: 400,
        }
      );
    }

    // =================================================
    // ORDER
    // =================================================

    const order = await db.order.findFirst({
      where: {
        id,
        userId: user.id,
      },

      include: {
        items: true,

        returnRequests: {
          where: {
            status: {
              in: [
                "REQUESTED",
                "APPROVED",
                "RECEIVED",
              ],
            },
          },

          include: {
            items: true,
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

    // =================================================
    // ORDER STATUS
    // =================================================

    if (
      order.status !== "DELIVERED" &&
      order.status !== "COMPLETED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Повернення можна оформити тільки для доставленого або завершеного замовлення",
        },
        {
          status: 409,
        }
      );
    }

    // =================================================
    // PREPARE REQUESTED ITEMS
    // =================================================

    const requestedItems = new Map<
      string,
      number
    >();

    for (const input of body.items) {
      const orderItemId =
        input.orderItemId?.trim();

      const quantity = input.quantity;

      if (!orderItemId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Для кожного товару необхідно вказати orderItemId",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isInteger(quantity) ||
        !quantity ||
        quantity < 1
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Кількість товару повинна бути цілим числом більше 0",
          },
          {
            status: 400,
          }
        );
      }

      requestedItems.set(
        orderItemId,
        (requestedItems.get(orderItemId) ?? 0) +
          quantity
      );
    }

    // =================================================
    // VALIDATE ORDER ITEMS
    // =================================================

    let refundAmount = 0;

    const returnItems: Array<{
      orderItemId: string;
      quantity: number;
    }> = [];

    for (const [
      orderItemId,
      quantity,
    ] of requestedItems.entries()) {
      const orderItem = order.items.find(
        (item) => item.id === orderItemId
      );

      if (!orderItem) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Один із товарів не належить цьому замовленню",
            orderItemId,
          },
          {
            status: 409,
          }
        );
      }

      // -----------------------------------------------
      // ALREADY RETURNED / REQUESTED QUANTITY
      // -----------------------------------------------

      let alreadyRequested = 0;

      for (const returnRequest of order.returnRequests) {
        for (const item of returnRequest.items) {
          if (
            item.orderItemId === orderItemId
          ) {
            alreadyRequested += item.quantity;
          }
        }
      }

      const remainingQuantity =
        orderItem.quantity -
        alreadyRequested;

      if (quantity > remainingQuantity) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Неможливо повернути ${quantity} шт. товару "${orderItem.productTitle}". Доступно для повернення: ${Math.max(
                remainingQuantity,
                0
              )} шт.`,
            orderItemId,
          },
          {
            status: 409,
          }
        );
      }

      refundAmount +=
        Number(orderItem.unitPrice) *
        quantity;

      returnItems.push({
        orderItemId,
        quantity,
      });
    }

    // =================================================
    // CREATE RETURN REQUEST
    // =================================================

    const returnRequest =
      await db.$transaction(async (tx) => {
        const created =
          await tx.returnRequest.create({
            data: {
              userId: user.id,
              orderId: order.id,

              reason,

              comment,

              status: "REQUESTED",

              refundAmount,
            },
          });

        await tx.returnItem.createMany({
          data: returnItems.map((item) => ({
            returnRequestId: created.id,
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        });

        return tx.returnRequest.findUniqueOrThrow(
          {
            where: {
              id: created.id,
            },

            include: {
              items: {
                include: {
                  orderItem: {
                    select: {
                      id: true,
                      productId: true,
                      variantId: true,
                      shopId: true,
                      productTitle: true,
                      sku: true,
                      quantity: true,
                      unitPrice: true,
                      totalPrice: true,
                    },
                  },
                },
              },
            },
          }
        );
      });

    // =================================================
    // SUCCESS
    // =================================================

    return NextResponse.json(
      {
        success: true,
        message:
          "Запит на повернення успішно створено",
        data: returnRequest,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/orders/[id]/return error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося створити запит на повернення",
      },
      {
        status: 500,
      }
    );
  }
}

