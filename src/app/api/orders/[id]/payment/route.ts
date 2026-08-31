
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// =====================================================
// TYPES
// =====================================================

type PaymentMethod =
  | "CARD"
  | "CASH_ON_DELIVERY"
  | "BANK_TRANSFER"
  | "APPLE_PAY"
  | "GOOGLE_PAY";

type CreatePaymentBody = {
  method?: PaymentMethod;
  provider?: string | null;
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
// GET /api/orders/[id]/payment
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
        orderNumber: true,
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

    const payments = await db.payment.findMany({
      where: {
        orderId: order.id,
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: payments,
      total: payments.length,
    });
  } catch (error) {
    console.error(
      "GET /api/orders/[id]/payment error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати платежі",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST /api/orders/[id]/payment
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

    let body: CreatePaymentBody;

    try {
      body = (await request.json()) as CreatePaymentBody;
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

    const method = body.method;

    const allowedMethods: PaymentMethod[] = [
      "CARD",
      "CASH_ON_DELIVERY",
      "BANK_TRANSFER",
      "APPLE_PAY",
      "GOOGLE_PAY",
    ];

    if (
      !method ||
      !allowedMethods.includes(method)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний спосіб оплати",
        },
        {
          status: 400,
        }
      );
    }

    const provider =
      body.provider?.trim() || null;

    // =================================================
    // ORDER
    // =================================================

    const order = await db.order.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        payments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
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
      order.status === "CANCELLED" ||
      order.status === "RETURNED" ||
      order.status === "REFUNDED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Для цього замовлення неможливо створити платіж",
        },
        {
          status: 409,
        }
      );
    }

    // =================================================
    // EXISTING PAID PAYMENT
    // =================================================

    const paidPayment = await db.payment.findFirst({
      where: {
        orderId: order.id,
        userId: user.id,
        status: "PAID",
      },
    });

    if (paidPayment) {
      return NextResponse.json(
        {
          success: false,
          error: "Замовлення вже оплачено",
          data: paidPayment,
        },
        {
          status: 409,
        }
      );
    }

    // =================================================
    // EXISTING PROCESSING PAYMENT
    // =================================================

    const processingPayment =
      await db.payment.findFirst({
        where: {
          orderId: order.id,
          userId: user.id,
          status: {
            in: ["PENDING", "PROCESSING"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (processingPayment) {
      return NextResponse.json({
        success: true,
        message: "Платіж уже очікує обробки",
        data: processingPayment,
      });
    }

    // =================================================
    // CREATE PAYMENT
    // =================================================

    const payment = await db.payment.create({
      data: {
        userId: user.id,
        orderId: order.id,

        amount: order.total,

        method,

        status: "PENDING",

        provider,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Платіж створено",
        data: payment,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/orders/[id]/payment error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити платіж",
      },
      {
        status: 500,
      }
    );
  }
}

