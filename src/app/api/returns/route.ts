
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type CreateReturnBody = {
  orderId?: string;
  reason?:
    | "DEFECTIVE"
    | "WRONG_ITEM"
    | "NOT_AS_DESCRIBED"
    | "DAMAGED"
    | "CHANGED_MIND"
    | "OTHER";
  comment?: string | null;
  items?: Array<{
    orderItemId?: string;
    quantity?: number;
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

  if (
    session.user.isBlocked ||
    session.user.status !== "ACTIVE"
  ) {
    return null;
  }

  return session.user;
}

// =====================================================
// RETURN INCLUDE
// =====================================================

const returnInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
    },
  },

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
} as const;

// =====================================================
// GET /api/returns
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
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const orderId =
      searchParams.get("orderId")?.trim() || undefined;

    const returns =
      await db.returnRequest.findMany({
        where: {
          userId: user.id,
          ...(orderId ? { orderId } : {}),
        },

        orderBy: {
          createdAt: "desc",
        },

        include: returnInclude,
      });

    return NextResponse.json({
      success: true,
      data: returns,
      total: returns.length,
    });
  } catch (error) {
    console.error(
      "GET /api/returns error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати повернення",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/returns
// =====================================================

export async function POST(request: NextRequest) {
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
        { status: 401 }
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
        { status: 400 }
      );
    }

    const orderId = body.orderId?.trim();
    const reason = body.reason;
    const comment =
      body.comment?.trim() || null;

    // =================================================
    // VALIDATE ORDER ID
    // =================================================

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "orderId є обов'язковим",
        },
        { status: 400 }
      );
    }

    // =================================================
    // VALIDATE REASON
    // =================================================

    if (
      reason !== "DEFECTIVE" &&
      reason !== "WRONG_ITEM" &&
      reason !== "NOT_AS_DESCRIBED" &&
      reason !== "DAMAGED" &&
      reason !== "CHANGED_MIND" &&
      reason !== "OTHER"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректна причина повернення",
        },
        { status: 400 }
      );
    }

    // =================================================
    // VALIDATE ITEMS
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
        { status: 400 }
      );
    }

    // =================================================
    // FIND ORDER
    // =================================================

    const order =
      await db.order.findFirst({
        where: {
          id: orderId,
          userId: user.id,
        },

        include: {
          items: {
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
      });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Замовлення не знайдено",
        },
        { status: 404 }
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
            "Повернення можна оформити лише для доставленого або завершеного замовлення",
        },
        { status: 409 }
      );
    }

    // =================================================
    // CHECK EXISTING RETURN
    // =================================================

    const existingReturn =
      await db.returnRequest.findFirst({
        where: {
          orderId: order.id,
          userId: user.id,

          status: {
            in: [
              "REQUESTED",
              "APPROVED",
              "RECEIVED",
            ],
          },
        },

        select: {
          id: true,
        },
      });

    if (existingReturn) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Для цього замовлення вже існує активне повернення",
        },
        { status: 409 }
      );
    }

    // =================================================
    // NORMALIZE ITEMS
    // =================================================

    const normalizedItems =
      body.items.map((item) => ({
        orderItemId:
          item.orderItemId?.trim(),
        quantity: item.quantity,
      }));

    // =================================================
    // VALIDATE ORDER ITEM IDS
    // =================================================

    for (const item of normalizedItems) {
      if (!item.orderItemId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Кожен товар повернення повинен містити orderItemId",
          },
          { status: 400 }
        );
      }
    }

    // =================================================
    // CHECK DUPLICATES
    // =================================================

    const orderItemIds =
      normalizedItems.map(
        (item) => item.orderItemId as string
      );

    const uniqueOrderItemIds =
      new Set(orderItemIds);

    if (
      uniqueOrderItemIds.size !==
      orderItemIds.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Один товар не можна вказувати декілька разів",
        },
        { status: 400 }
      );
    }

    // =================================================
    // SELECT ITEMS
    // =================================================

    const selectedItems: Array<{
      orderItem: (typeof order.items)[number];
      quantity: number;
    }> = [];

    for (const item of normalizedItems) {
      const orderItem =
        order.items.find(
          (currentItem) =>
            currentItem.id ===
            item.orderItemId
        );

      if (!orderItem) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Один із товарів не належить цьому замовленню",
            orderItemId:
              item.orderItemId,
          },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(item.quantity) ||
        !item.quantity ||
        item.quantity < 1
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Некоректна кількість для товару "${orderItem.productTitle}"`,
          },
          { status: 400 }
        );
      }

      if (
        item.quantity >
        orderItem.quantity
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Кількість для товару "${orderItem.productTitle}" перевищує кількість у замовленні`,
            available:
              orderItem.quantity,
            requested:
              item.quantity,
          },
          { status: 409 }
        );
      }

      selectedItems.push({
        orderItem,
        quantity: item.quantity,
      });
    }

    // =================================================
    // CALCULATE REFUND
    // =================================================

    let refundAmount = 0;

    for (const item of selectedItems) {
      refundAmount +=
        Number(item.orderItem.unitPrice) *
        item.quantity;
    }

    // =================================================
    // CREATE RETURN
    // =================================================

    const returnRequest =
      await db.$transaction(
        async (tx) => {
          const createdReturn =
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
            data: selectedItems.map(
              (item) => ({
                returnRequestId:
                  createdReturn.id,

                orderItemId:
                  item.orderItem.id,

                quantity:
                  item.quantity,
              })
            ),
          });

          return tx.returnRequest.findUniqueOrThrow(
            {
              where: {
                id: createdReturn.id,
              },

              include: returnInclude,
            }
          );
        }
      );

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
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/returns error:",
      error
    );

    // =================================================
    // PRISMA UNIQUE
    // =================================================

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error
    ) {
      const prismaError =
        error as {
          code?: string;
        };

      if (
        prismaError.code === "P2002"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Такий товар уже доданий до цього повернення",
          },
          { status: 409 }
        );
      }
    }

    // =================================================
    // DEFAULT ERROR
    // =================================================

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося створити запит на повернення",
      },
      { status: 500 }
    );
  }
}
