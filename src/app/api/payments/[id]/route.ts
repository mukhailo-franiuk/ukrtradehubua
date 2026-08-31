
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

const paymentInclude = {
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
} as const;

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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID платежу є обов'язковим",
        },
        { status: 400 }
      );
    }

    const payment = await db.payment.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: paymentInclude,
    });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "Платіж не знайдено",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error(
      "GET /api/payments/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати платіж",
      },
      { status: 500 }
    );
  }
}

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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID платежу є обов'язковим",
        },
        { status: 400 }
      );
    }

    const payment = await db.payment.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "Платіж не знайдено",
        },
        { status: 404 }
      );
    }

    /*
     * Статус платежу не змінюється покупцем.
     *
     * Його змінює платіжний провайдер або серверна
     * логіка після підтвердження оплати.
     */

    return NextResponse.json(
      {
        success: false,
        error:
          "Статус платежу не може бути змінений покупцем",
      },
      { status: 403 }
    );
  } catch (error) {
    console.error(
      "PATCH /api/payments/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося змінити платіж",
      },
      { status: 500 }
    );
  }
}

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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID платежу є обов'язковим",
        },
        { status: 400 }
      );
    }

    const payment = await db.payment.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "Платіж не знайдено",
        },
        { status: 404 }
      );
    }

    if (
      payment.status !== "PENDING" &&
      payment.status !== "PROCESSING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Цей платіж більше не можна скасувати",
        },
        { status: 409 }
      );
    }

    const cancelledPayment =
      await db.payment.update({
        where: {
          id: payment.id,
        },

        data: {
          status: "CANCELLED",
        },

        include: paymentInclude,
      });

    return NextResponse.json({
      success: true,
      message: "Платіж скасовано",
      data: cancelledPayment,
    });
  } catch (error) {
    console.error(
      "DELETE /api/payments/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося скасувати платіж",
      },
      { status: 500 }
    );
  }
}

