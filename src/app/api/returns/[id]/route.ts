
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

type UpdateReturnBody = {
  status?:
    | "REQUESTED"
    | "APPROVED"
    | "REJECTED"
    | "RECEIVED"
    | "REFUNDED"
    | "CANCELLED";

  refundAmount?: number | null;
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
      subtotal: true,
      discountAmount: true,
      deliveryAmount: true,
      total: true,
      customerNote: true,
      shippingMethod: true,
      createdAt: true,
      updatedAt: true,
    },
  },

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
} as const;

// =====================================================
// GET /api/returns/[id]
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
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний ID повернення",
        },
        { status: 400 }
      );
    }

    const returnRequest =
      await db.returnRequest.findFirst({
        where: {
          id,
          userId: user.id,
        },

        include: returnInclude,
      });

    if (!returnRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "Повернення не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: returnRequest,
    });
  } catch (error) {
    console.error(
      "GET /api/returns/[id] error:",
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
// PATCH /api/returns/[id]
// =====================================================

export async function PATCH(
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
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний ID повернення",
        },
        { status: 400 }
      );
    }

    // =================================================
    // FIND RETURN
    // =================================================

    const existingReturn =
      await db.returnRequest.findFirst({
        where: {
          id,
          userId: user.id,
        },

        include: {
          items: {
            include: {
              orderItem: true,
            },
          },
        },
      });

    if (!existingReturn) {
      return NextResponse.json(
        {
          success: false,
          error: "Повернення не знайдено",
        },
        { status: 404 }
      );
    }

    // =================================================
    // BODY
    // =================================================

    let body: UpdateReturnBody;

    try {
      body = (await request.json()) as UpdateReturnBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний JSON",
        },
        { status: 400 }
      );
    }

    // =================================================
    // STATUS
    // =================================================

    if (body.status !== undefined) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Статус повернення змінюється продавцем або адміністратором",
        },
        { status: 403 }
      );
    }

    // =================================================
    // REFUND AMOUNT
    // =================================================

    if (body.refundAmount !== undefined) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Сума повернення не може змінюватися покупцем",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Немає доступних для покупця змін",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "PATCH /api/returns/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося оновити повернення",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE /api/returns/[id]
// =====================================================

export async function DELETE(
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
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний ID повернення",
        },
        { status: 400 }
      );
    }

    // =================================================
    // FIND RETURN
    // =================================================

    const returnRequest =
      await db.returnRequest.findFirst({
        where: {
          id,
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
          error: "Повернення не знайдено",
        },
        { status: 404 }
      );
    }

    // =================================================
    // ONLY REQUESTED CAN BE CANCELLED
    // =================================================

    if (
      returnRequest.status !== "REQUESTED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Скасувати можна лише запит на повернення зі статусом REQUESTED",
        },
        { status: 409 }
      );
    }

    // =================================================
    // CANCEL RETURN
    // =================================================

    const cancelledReturn =
      await db.returnRequest.update({
        where: {
          id: returnRequest.id,
        },

        data: {
          status: "CANCELLED",
        },

        include: returnInclude,
      });

    return NextResponse.json({
      success: true,
      message:
        "Запит на повернення скасовано",
      data: cancelledReturn,
    });
  } catch (error) {
    console.error(
      "DELETE /api/returns/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Не вдалося скасувати повернення",
      },
      { status: 500 }
    );
  }
}

