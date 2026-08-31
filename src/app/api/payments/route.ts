
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

type PaymentMethod =
  | "CARD"
  | "CASH_ON_DELIVERY"
  | "BANK_TRANSFER"
  | "APPLE_PAY"
  | "GOOGLE_PAY";

type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CANCELLED";

type CreatePaymentBody = {
  orderId?: string;
  method?: PaymentMethod;
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

    const statusParam =
      searchParams.get("status")?.trim() || undefined;

    const allowedStatuses: PaymentStatus[] = [
      "PENDING",
      "PROCESSING",
      "PAID",
      "FAILED",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
      "CANCELLED",
    ];

    let status: PaymentStatus | undefined;

    if (statusParam) {
      if (
        !allowedStatuses.includes(
          statusParam as PaymentStatus
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Некоректний статус платежу",
          },
          { status: 400 }
        );
      }

      status = statusParam as PaymentStatus;
    }

    const payments = await db.payment.findMany({
      where: {
        userId: user.id,

        ...(orderId
          ? {
              orderId,
            }
          : {}),

        ...(status
          ? {
              status,
            }
          : {}),
      },

      orderBy: {
        createdAt: "desc",
      },

      include: paymentInclude,
    });

    return NextResponse.json({
      success: true,
      data: payments,
      total: payments.length,
    });
  } catch (error) {
    console.error("GET /api/payments error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати платежі",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    let body: CreatePaymentBody;

    try {
      body = (await request.json()) as CreatePaymentBody;
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
    const method = body.method;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "orderId є обов'язковим",
        },
        { status: 400 }
      );
    }

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
          error: "Некоректний метод оплати",
        },
        { status: 400 }
      );
    }

    const order = await db.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },

      select: {
        id: true,
        status: true,
        total: true,
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
        { status: 409 }
      );
    }

    const existingPayment =
      await db.payment.findFirst({
        where: {
          orderId: order.id,
          userId: user.id,
          status: {
            in: [
              "PENDING",
              "PROCESSING",
              "PAID",
            ],
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    if (existingPayment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Для цього замовлення вже існує активний платіж",
          data: existingPayment,
        },
        { status: 409 }
      );
    }

    const payment = await db.payment.create({
      data: {
        userId: user.id,
        orderId: order.id,
        amount: order.total,
        method,
        status: "PENDING",
      },

      include: paymentInclude,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Платіж успішно створено",
        data: payment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/payments error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити платіж",
      },
      { status: 500 }
    );
  }
}

