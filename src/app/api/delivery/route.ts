
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

type DeliveryMethod =
  | "NOVA_POSHTA"
  | "UKRPOSHTA"
  | "MIST"
  | "COURIER"
  | "PICKUP";

type CreateDeliveryBody = {
  orderId?: string;
  method?: DeliveryMethod;
  trackingNumber?: string | null;
  carrier?: string | null;
  city?: string | null;
  warehouse?: string | null;
  address?: string | null;
};

const deliveryMethods: DeliveryMethod[] = [
  "NOVA_POSHTA",
  "UKRPOSHTA",
  "MIST",
  "COURIER",
  "PICKUP",
];

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

const deliveryInclude = {
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
      searchParams.get("orderId")?.trim();

    if (orderId) {
      const order = await db.order.findFirst({
        where: {
          id: orderId,
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
          { status: 404 }
        );
      }

      const delivery =
        await db.delivery.findUnique({
          where: {
            orderId,
          },
          include: deliveryInclude,
        });

      if (!delivery) {
        return NextResponse.json(
          {
            success: false,
            error: "Доставку для цього замовлення не знайдено",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: delivery,
      });
    }

    const deliveries = await db.delivery.findMany({
      where: {
        order: {
          userId: user.id,
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      include: deliveryInclude,
    });

    return NextResponse.json({
      success: true,
      data: deliveries,
      total: deliveries.length,
    });
  } catch (error) {
    console.error(
      "GET /api/delivery error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося отримати доставки",
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

    let body: CreateDeliveryBody;

    try {
      body = (await request.json()) as CreateDeliveryBody;
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

    if (
      !method ||
      !deliveryMethods.includes(method)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Некоректний метод доставки",
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
            "Для цього замовлення неможливо створити доставку",
        },
        { status: 409 }
      );
    }

    const existingDelivery =
      await db.delivery.findUnique({
        where: {
          orderId: order.id,
        },
        select: {
          id: true,
        },
      });

    if (existingDelivery) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Для цього замовлення доставка вже створена",
        },
        { status: 409 }
      );
    }

    const delivery =
      await db.delivery.create({
        data: {
          orderId: order.id,
          method,

          trackingNumber:
            body.trackingNumber?.trim() || null,

          carrier:
            body.carrier?.trim() || null,

          city:
            body.city?.trim() || null,

          warehouse:
            body.warehouse?.trim() || null,

          address:
            body.address?.trim() || null,

          status: "PENDING",
        },

        include: deliveryInclude,
      });

    return NextResponse.json(
      {
        success: true,
        message: "Доставку успішно створено",
        data: delivery,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/delivery error:",
      error
    );

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
            "Для цього замовлення доставка вже існує",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Не вдалося створити доставку",
      },
      { status: 500 }
    );
  }
}

